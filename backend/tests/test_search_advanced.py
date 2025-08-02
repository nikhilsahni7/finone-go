#!/usr/bin/env python3
"""
Advanced test suite for Finone Search System with 101M records
Tests performance, accuracy, and edge cases
"""

import requests
import json
import time
import concurrent.futures
import statistics
from datetime import datetime
import sys

class FinoneSearchTester:
    def __init__(self, base_url="http://localhost:8082/api/v1"):
        self.base_url = base_url
        self.jwt_token = None
        self.test_results = []

    def login(self, email="admin@finone.com", password="admin123"):
        """Login and get JWT token"""
        login_data = {
            "email": email,
            "password": password
        }

        try:
            response = requests.post(f"{self.base_url}/auth/login", json=login_data)
            if response.status_code == 200:
                data = response.json()
                self.jwt_token = data.get('token')
                print(f"✅ Login successful")
                return True
            else:
                print(f"❌ Login failed: {response.text}")
                return False
        except Exception as e:
            print(f"❌ Login error: {e}")
            return False

    def get_headers(self):
        """Get headers with JWT token"""
        return {
            "Authorization": f"Bearer {self.jwt_token}",
            "Content-Type": "application/json"
        }

    def health_check(self):
        """Check system health"""
        try:
            # Remove the /api/v1 part for health check
            health_url = self.base_url.replace("/api/v1", "") + "/health"
            response = requests.get(health_url)
            if response.status_code == 200:
                data = response.json()
                print(f"🏥 Health Status: {data.get('status')}")
                print(f"   PostgreSQL: {'✅' if data.get('postgresql') else '❌'}")
                print(f"   ClickHouse: {'✅' if data.get('clickhouse') else '❌'}")
                return data.get('status') == 'healthy'
            return False
        except Exception as e:
            print(f"❌ Health check failed: {e}")
            return False

    def get_stats(self):
        """Get database statistics"""
        try:
            response = requests.get(f"{self.base_url}/search/stats", headers=self.get_headers())
            if response.status_code == 200:
                data = response.json()
                print(f"📊 Database Statistics:")
                print(f"   Total Records: {data.get('total_records', 0):,}")
                print(f"   Avg Search Time: {data.get('avg_search_time_ms', 0):.2f}ms")
                print(f"   Searches (24h): {data.get('searches_last_24h', 0)}")
                return data
            return {}
        except Exception as e:
            print(f"❌ Stats error: {e}")
            return {}

    def search(self, query, fields=None, match_type="partial", limit=1000, offset=0, logic="OR"):
        """Perform a search"""
        search_data = {
            "query": query,
            "match_type": match_type,
            "limit": limit,
            "offset": offset,
            "logic": logic
        }

        if fields:
            search_data["fields"] = fields

        start_time = time.time()
        try:
            response = requests.post(f"{self.base_url}/search/",
                                   json=search_data,
                                   headers=self.get_headers())
            end_time = time.time()

            if response.status_code == 200:
                data = response.json()
                result = {
                    "success": True,
                    "query": query,
                    "total_count": data.get('TotalCount', 0),
                    "execution_time": data.get('ExecutionTime', 0),
                    "network_time": int((end_time - start_time) * 1000),
                    "search_id": data.get('SearchID'),
                    "has_more": data.get('HasMore', False),
                    "results": data.get('Results', [])
                }
            else:
                result = {
                    "success": False,
                    "query": query,
                    "error": response.text,
                    "status_code": response.status_code
                }
        except Exception as e:
            result = {
                "success": False,
                "query": query,
                "error": str(e)
            }

        self.test_results.append(result)
        return result

    def test_basic_searches(self):
        """Test basic search functionality"""
        print("\n🔍 Testing Basic Searches")
        print("=" * 50)

        test_cases = [
            ("9876543210", ["mobile"], "full", "Mobile exact match"),
            ("John", ["name"], "partial", "Name partial match"),
            ("Delhi", ["address"], "partial", "Address search"),
            ("Singh", ["name", "fname"], "partial", "Multi-field search"),
            ("admin", ["email"], "partial", "Email search"),
            ("Mumbai", ["circle"], "full", "Circle exact match"),
        ]

        for query, fields, match_type, description in test_cases:
            print(f"\n📝 {description}")
            result = self.search(query, fields, match_type)

            if result["success"]:
                print(f"   ✅ Found {result['total_count']} results in {result['execution_time']}ms")
                if result["total_count"] > 0:
                    sample = result["results"][0] if result["results"] else {}
                    print(f"   📄 Sample: {sample.get('name', 'N/A')} - {sample.get('mobile', 'N/A')}")
            else:
                print(f"   ❌ Failed: {result.get('error', 'Unknown error')}")

    def test_performance_scenarios(self):
        """Test various performance scenarios"""
        print("\n⚡ Testing Performance Scenarios")
        print("=" * 50)

        scenarios = [
            ("Large result set", {"query": "a", "limit": 10000}),
            ("Complex query", {"query": "Kumar", "fields": ["name", "address"], "limit": 5000}),
            ("Pagination", {"query": "Sharma", "limit": 1000, "offset": 5000}),
            ("Exact mobile", {"query": "9876543210", "fields": ["mobile"], "match_type": "full"}),
            ("Common name", {"query": "Singh", "fields": ["name"], "limit": 1000}),
        ]

        for description, params in scenarios:
            print(f"\n🚀 {description}")
            result = self.search(**params)

            if result["success"]:
                exec_time = result['execution_time']
                network_time = result['network_time']
                total_count = result['total_count']

                print(f"   ✅ Results: {total_count:,}")
                print(f"   ⏱️  DB Time: {exec_time}ms | Network: {network_time}ms")

                # Performance rating
                if exec_time < 50:
                    print(f"   🟢 Excellent performance")
                elif exec_time < 200:
                    print(f"   🟡 Good performance")
                else:
                    print(f"   🔴 Needs optimization")
            else:
                print(f"   ❌ Failed: {result.get('error', 'Unknown error')}")

    def test_concurrent_searches(self, num_threads=5):
        """Test concurrent search performance"""
        print(f"\n🔄 Testing Concurrent Searches ({num_threads} threads)")
        print("=" * 50)

        search_queries = [
            ("Singh", ["name"]),
            ("Mumbai", ["circle"]),
            ("9876", ["mobile"]),
            ("Delhi", ["address"]),
            ("Kumar", ["fname"])
        ]

        def perform_search(query_data):
            query, fields = query_data
            return self.search(query, fields)

        start_time = time.time()

        with concurrent.futures.ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = [executor.submit(perform_search, query) for query in search_queries]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]

        end_time = time.time()
        total_time = int((end_time - start_time) * 1000)

        successful = [r for r in results if r["success"]]
        execution_times = [r["execution_time"] for r in successful]

        print(f"   ✅ Completed {len(successful)}/{len(results)} searches")
        print(f"   ⏱️  Total Time: {total_time}ms")
        if execution_times:
            print(f"   📊 Avg DB Time: {statistics.mean(execution_times):.1f}ms")
            print(f"   📊 Max DB Time: {max(execution_times)}ms")

    def test_edge_cases(self):
        """Test edge cases and error handling"""
        print("\n🧪 Testing Edge Cases")
        print("=" * 50)

        edge_cases = [
            ("", [], "partial", "Empty query"),
            ("   ", [], "partial", "Whitespace query"),
            ("x" * 1000, [], "partial", "Very long query"),
            ("!@#$%^&*()", [], "partial", "Special characters"),
            ("SELECT * FROM", [], "partial", "SQL injection attempt"),
            ("nonexistent123456", [], "full", "Non-existent data"),
        ]

        for query, fields, match_type, description in edge_cases:
            print(f"\n🧨 {description}")
            result = self.search(query, fields, match_type)

            if result["success"]:
                print(f"   ✅ Handled gracefully - {result['total_count']} results")
            else:
                print(f"   ⚠️  Error (expected): {result.get('error', 'Unknown')}")

    def test_pagination_accuracy(self):
        """Test pagination accuracy"""
        print("\n📄 Testing Pagination Accuracy")
        print("=" * 50)

        # Get first page
        page1 = self.search("Singh", ["name"], limit=100, offset=0)
        page2 = self.search("Singh", ["name"], limit=100, offset=100)
        page3 = self.search("Singh", ["name"], limit=100, offset=200)

        if all(r["success"] for r in [page1, page2, page3]):
            # Check for duplicates
            ids_page1 = {r.get("id") for r in page1["results"]}
            ids_page2 = {r.get("id") for r in page2["results"]}
            ids_page3 = {r.get("id") for r in page3["results"]}

            duplicates = ids_page1.intersection(ids_page2).union(ids_page1.intersection(ids_page3)).union(ids_page2.intersection(ids_page3))

            print(f"   Page 1: {len(page1['results'])} results")
            print(f"   Page 2: {len(page2['results'])} results")
            print(f"   Page 3: {len(page3['results'])} results")
            print(f"   Duplicates: {len(duplicates)}")

            if len(duplicates) == 0:
                print(f"   ✅ Pagination is accurate")
            else:
                print(f"   ❌ Found {len(duplicates)} duplicates")
        else:
            print(f"   ❌ Pagination test failed")

    def generate_report(self):
        """Generate performance report"""
        print("\n📊 Performance Report")
        print("=" * 50)

        successful_tests = [r for r in self.test_results if r["success"]]

        if not successful_tests:
            print("   ❌ No successful tests to analyze")
            return

        execution_times = [r["execution_time"] for r in successful_tests]
        network_times = [r["network_time"] for r in successful_tests]
        total_results = sum(r["total_count"] for r in successful_tests)

        print(f"   Total Tests: {len(self.test_results)}")
        print(f"   Successful: {len(successful_tests)}")
        print(f"   Success Rate: {(len(successful_tests)/len(self.test_results)*100):.1f}%")
        print(f"   Total Results Found: {total_results:,}")
        print(f"\n   Database Performance:")
        print(f"     Average: {statistics.mean(execution_times):.1f}ms")
        print(f"     Median: {statistics.median(execution_times):.1f}ms")
        print(f"     Min: {min(execution_times)}ms")
        print(f"     Max: {max(execution_times)}ms")
        print(f"\n   Network Performance:")
        print(f"     Average: {statistics.mean(network_times):.1f}ms")

        # Performance rating
        avg_time = statistics.mean(execution_times)
        if avg_time < 100:
            rating = "🟢 EXCELLENT"
        elif avg_time < 300:
            rating = "🟡 GOOD"
        elif avg_time < 500:
            rating = "🟠 FAIR"
        else:
            rating = "🔴 NEEDS OPTIMIZATION"

        print(f"\n   Overall Rating: {rating}")

        # Save detailed results
        with open('test_results_detailed.json', 'w') as f:
            json.dump(self.test_results, f, indent=2)
        print(f"\n   📁 Detailed results saved to: test_results_detailed.json")

def main():
    print("🚀 Finone Search System - Advanced Performance Test")
    print("=" * 60)

    tester = FinoneSearchTester()

    # Health check
    if not tester.health_check():
        print("❌ System health check failed. Exiting.")
        sys.exit(1)

    # Login
    if not tester.login():
        print("❌ Authentication failed. Exiting.")
        sys.exit(1)

    # Get stats
    stats = tester.get_stats()
    total_records = stats.get('total_records', 0)

    if total_records < 100000000:
        print(f"⚠️  Warning: Database has {total_records:,} records (expected 101M+)")
    else:
        print(f"✅ Database confirmed with {total_records:,} records")

    # Run all tests
    tester.test_basic_searches()
    tester.test_performance_scenarios()
    tester.test_concurrent_searches()
    tester.test_edge_cases()
    tester.test_pagination_accuracy()

    # Generate final report
    tester.generate_report()

    print(f"\n🏁 Testing completed at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    main()
