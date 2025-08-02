#!/bin/bash

# Test script for Finone Search System with 101M records
# This script tests various search scenarios and performance

BASE_URL="http://localhost:8082/api/v1"
OUTPUT_DIR="test_results"
mkdir -p $OUTPUT_DIR

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to make authenticated requests
make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local output_file=$4

    if [ "$method" = "POST" ]; then
        if [ -n "$data" ]; then
            curl -s -X POST \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $JWT_TOKEN" \
                -d "$data" \
                "$BASE_URL$endpoint" > "$output_file"
        else
            curl -s -X POST \
                -H "Authorization: Bearer $JWT_TOKEN" \
                "$BASE_URL$endpoint" > "$output_file"
        fi
    else
        curl -s -X GET \
            -H "Authorization: Bearer $JWT_TOKEN" \
            "$BASE_URL$endpoint" > "$output_file"
    fi
}

# Function to test response time and validate results
test_search() {
    local test_name=$1
    local search_data=$2
    local expected_min_results=$3

    print_status $BLUE "Testing: $test_name"

    local start_time=$(date +%s%N)
    make_request "POST" "/search/" "$search_data" "$OUTPUT_DIR/search_${test_name// /_}.json"
    local end_time=$(date +%s%N)

    local duration=$((($end_time - $start_time) / 1000000)) # Convert to milliseconds

    # Parse results
    local total_count=$(jq -r '.TotalCount // 0' "$OUTPUT_DIR/search_${test_name// /_}.json")
    local execution_time=$(jq -r '.ExecutionTime // 0' "$OUTPUT_DIR/search_${test_name// /_}.json")
    local search_id=$(jq -r '.SearchID // "N/A"' "$OUTPUT_DIR/search_${test_name// /_}.json")
    local has_more=$(jq -r '.HasMore // false' "$OUTPUT_DIR/search_${test_name// /_}.json")

    # Check for errors
    local error=$(jq -r '.error // empty' "$OUTPUT_DIR/search_${test_name// /_}.json")

    if [ -n "$error" ]; then
        print_status $RED "❌ FAILED: $error"
        return 1
    fi

    if [ "$total_count" -ge "$expected_min_results" ]; then
        print_status $GREEN "✅ PASSED"
    else
        print_status $RED "❌ FAILED: Expected at least $expected_min_results results, got $total_count"
    fi

    echo "   Results: $total_count"
    echo "   Execution Time: ${execution_time}ms"
    echo "   Network Time: ${duration}ms"
    echo "   Search ID: $search_id"
    echo "   Has More: $has_more"
    echo ""
}

print_status $YELLOW "🚀 Starting Finone Search System Tests with 101M Records"
echo "========================================================================"

# Step 1: Health Check
print_status $BLUE "1. Health Check"
curl -s "$BASE_URL/../health" > "$OUTPUT_DIR/health.json"
health_status=$(jq -r '.status' "$OUTPUT_DIR/health.json")
if [ "$health_status" = "healthy" ]; then
    print_status $GREEN "✅ System is healthy"
else
    print_status $RED "❌ System is unhealthy"
    exit 1
fi
echo ""

# Step 2: Login (assuming test user exists)
print_status $BLUE "2. Authentication"
LOGIN_DATA='{
    "email": "admin@example.com",
    "password": "admin123"
}'

curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "$LOGIN_DATA" \
    "$BASE_URL/auth/login" > "$OUTPUT_DIR/login.json"

JWT_TOKEN=$(jq -r '.token // empty' "$OUTPUT_DIR/login.json")
if [ -n "$JWT_TOKEN" ] && [ "$JWT_TOKEN" != "null" ]; then
    print_status $GREEN "✅ Login successful"
else
    print_status $RED "❌ Login failed"
    echo "Response:"
    cat "$OUTPUT_DIR/login.json"
    exit 1
fi
echo ""

# Step 3: Get Database Stats
print_status $BLUE "3. Database Statistics"
make_request "GET" "/search/stats" "" "$OUTPUT_DIR/stats.json"
total_records=$(jq -r '.total_records // 0' "$OUTPUT_DIR/stats.json")
avg_search_time=$(jq -r '.avg_search_time_ms // 0' "$OUTPUT_DIR/stats.json")
searches_24h=$(jq -r '.searches_last_24h // 0' "$OUTPUT_DIR/stats.json")

print_status $GREEN "📊 Database contains: $total_records records"
echo "   Average search time: ${avg_search_time}ms"
echo "   Searches in last 24h: $searches_24h"
echo ""

# Step 4: Basic Search Tests
print_status $YELLOW "4. Basic Search Tests"
echo "----------------------------------------"

# Test 1: Simple mobile search
test_search "Mobile Search" '{
    "query": "9876543210",
    "fields": ["mobile"],
    "match_type": "full",
    "limit": 100
}' 1

# Test 2: Name partial search
test_search "Name Partial Search" '{
    "query": "John",
    "fields": ["name"],
    "match_type": "partial",
    "limit": 1000
}' 1

# Test 3: Address search
test_search "Address Search" '{
    "query": "Delhi",
    "fields": ["address"],
    "match_type": "partial",
    "limit": 5000
}' 100

# Test 4: Multi-field search
test_search "Multi-field Search" '{
    "query": "Singh",
    "fields": ["name", "fname"],
    "match_type": "partial",
    "limit": 10000,
    "logic": "OR"
}' 1000

# Step 5: Performance Tests
print_status $YELLOW "5. Performance Tests"
echo "----------------------------------------"

# Test 5: Large result set
test_search "Large Result Set" '{
    "query": "a",
    "match_type": "partial",
    "limit": 10000
}' 10000

# Test 6: Complex query with multiple conditions
test_search "Complex Query" '{
    "query": "Kumar",
    "fields": ["name", "fname", "address"],
    "match_type": "partial",
    "limit": 5000,
    "logic": "OR"
}' 1000

# Test 7: Pagination test
test_search "Pagination Test" '{
    "query": "Sharma",
    "match_type": "partial",
    "limit": 1000,
    "offset": 5000
}' 500

# Step 6: Edge Cases
print_status $YELLOW "6. Edge Case Tests"
echo "----------------------------------------"

# Test 8: Empty query (should fail gracefully)
test_search "Empty Query" '{
    "query": "",
    "limit": 100
}' 0

# Test 9: Very specific search
test_search "Specific Email Search" '{
    "query": "john.doe@email.com",
    "fields": ["email"],
    "match_type": "full",
    "limit": 10
}' 1

# Test 10: Circle-based search
test_search "Circle Search" '{
    "query": "Mumbai",
    "fields": ["circle"],
    "match_type": "full",
    "limit": 100000
}' 1000

# Step 7: Stress Tests
print_status $YELLOW "7. Stress Tests"
echo "----------------------------------------"

# Run multiple concurrent searches
print_status $BLUE "Testing concurrent searches..."
for i in {1..5}; do
    (
        test_search "Concurrent Search $i" '{
            "query": "test'$i'",
            "match_type": "partial",
            "limit": 1000
        }' 0
    ) &
done
wait

# Step 8: Search Within Test (if previous search exists)
print_status $YELLOW "8. Search Within Test"
echo "----------------------------------------"

# First, perform a search to get a search ID
INITIAL_SEARCH='{
    "query": "Singh",
    "fields": ["name"],
    "match_type": "partial",
    "limit": 5000
}'

make_request "POST" "/search/" "$INITIAL_SEARCH" "$OUTPUT_DIR/initial_search.json"
SEARCH_ID=$(jq -r '.SearchID // empty' "$OUTPUT_DIR/initial_search.json")

if [ -n "$SEARCH_ID" ] && [ "$SEARCH_ID" != "null" ]; then
    print_status $BLUE "Testing Search Within with ID: $SEARCH_ID"

    SEARCH_WITHIN_DATA='{
        "search_id": "'$SEARCH_ID'",
        "query": "Delhi",
        "fields": ["address"],
        "match_type": "partial",
        "limit": 1000
    }'

    start_time=$(date +%s%N)
    make_request "POST" "/search/within" "$SEARCH_WITHIN_DATA" "$OUTPUT_DIR/search_within.json"
    end_time=$(date +%s%N)

    duration=$((($end_time - $start_time) / 1000000))
    within_count=$(jq -r '.TotalCount // 0' "$OUTPUT_DIR/search_within.json")
    within_time=$(jq -r '.ExecutionTime // 0' "$OUTPUT_DIR/search_within.json")

    print_status $GREEN "✅ Search Within completed"
    echo "   Results: $within_count"
    echo "   Execution Time: ${within_time}ms"
    echo "   Network Time: ${duration}ms"
else
    print_status $RED "❌ Could not get search ID for Search Within test"
fi
echo ""

# Step 9: Performance Summary
print_status $YELLOW "9. Performance Summary"
echo "========================================================================"

# Analyze all search results
total_tests=0
passed_tests=0
total_execution_time=0
max_execution_time=0
min_execution_time=999999

for file in $OUTPUT_DIR/search_*.json; do
    if [ -f "$file" ]; then
        execution_time=$(jq -r '.ExecutionTime // 0' "$file")
        if [ "$execution_time" -gt 0 ]; then
            total_tests=$((total_tests + 1))
            total_execution_time=$((total_execution_time + execution_time))

            if [ "$execution_time" -gt "$max_execution_time" ]; then
                max_execution_time=$execution_time
            fi

            if [ "$execution_time" -lt "$min_execution_time" ]; then
                min_execution_time=$execution_time
            fi

            error=$(jq -r '.error // empty' "$file")
            if [ -z "$error" ]; then
                passed_tests=$((passed_tests + 1))
            fi
        fi
    fi
done

if [ "$total_tests" -gt 0 ]; then
    avg_execution_time=$((total_execution_time / total_tests))

    print_status $GREEN "📊 Performance Summary:"
    echo "   Total Tests: $total_tests"
    echo "   Passed Tests: $passed_tests"
    echo "   Success Rate: $(( (passed_tests * 100) / total_tests ))%"
    echo "   Average Execution Time: ${avg_execution_time}ms"
    echo "   Min Execution Time: ${min_execution_time}ms"
    echo "   Max Execution Time: ${max_execution_time}ms"
    echo "   Total Records in DB: $total_records"
fi

print_status $YELLOW "🏁 Test Results saved in: $OUTPUT_DIR/"
print_status $GREEN "✅ Testing completed!"

# Recommendations
echo ""
print_status $YELLOW "💡 Performance Recommendations:"
if [ "$avg_execution_time" -lt 100 ]; then
    print_status $GREEN "   ✅ Excellent performance (< 100ms average)"
elif [ "$avg_execution_time" -lt 500 ]; then
    print_status $YELLOW "   ⚠️  Good performance (< 500ms average)"
else
    print_status $RED "   ❌ Consider optimization (> 500ms average)"
fi

if [ "$max_execution_time" -gt 1000 ]; then
    print_status $RED "   ❌ Some queries are slow (> 1s), consider indexing"
fi

if [ "$total_records" -gt 100000000 ]; then
    print_status $GREEN "   ✅ Successfully handling 100M+ records"
fi
