# Copilot Instructions for Finone Search System

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a high-performance people search system built with Golang, designed to handle 100+ million records efficiently using ClickHouse for search operations and PostgreSQL for user management.

## Key Guidelines
- Use ClickHouse for all search and read-heavy operations
- Use PostgreSQL for authentication, user management, and audit logging
- Implement efficient batch processing for CSV ingestion
- Follow JWT-based authentication patterns
- Implement proper error handling and logging
- Use structured logging with appropriate log levels
- Optimize database queries for performance
- Implement proper rate limiting and usage tracking

## Architecture Patterns
- Clean architecture with separate handlers, services, and models
- Database abstraction layers for ClickHouse and PostgreSQL
- Middleware for authentication and request validation
- Background processing for large CSV imports
- Connection pooling for database connections

## Performance Considerations
- Use batch inserts for ClickHouse data ingestion
- Implement connection pooling
- Use prepared statements where appropriate
- Monitor memory usage during large operations
- Implement proper indexing strategies
