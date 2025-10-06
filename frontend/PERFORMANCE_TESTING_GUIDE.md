# AI Usage Page Performance Testing Guide

This guide provides comprehensive instructions for testing the AI Usage page performance with large datasets (thousands of records).

## Prerequisites

1. **Backend running** with test data
2. **Frontend running** in development mode
3. **Admin access** to the dashboard
4. **Browser DevTools** open for performance monitoring

## Test Data Setup

### 1. Generate Test Data

Run the data seeder script to generate thousands of AI usage records:

```bash
# Navigate to backend directory
cd backend

# Generate 10,000 records with 100 users
python seed_ai_usage_data.py --count 10000 --users 100

# Or generate 50,000 records with 500 users for extreme testing
python seed_ai_usage_data.py --count 50000 --users 500 --clear
```

### 2. Verify Data Generation

Check that data was created successfully:

```bash
# Check database directly
sqlite3 cv_optimizer.db "SELECT COUNT(*) FROM ai_usage_logs;"
sqlite3 cv_optimizer.db "SELECT COUNT(*) FROM users WHERE email LIKE '%@example.com';"
```

## Performance Testing Scenarios

### Scenario 1: Basic Page Load Performance

**Objective**: Test initial page load with large datasets

**Steps**:
1. Open browser DevTools (F12)
2. Go to Network tab
3. Clear cache and reload
4. Navigate to Admin Dashboard → AI Usage tab
5. Monitor:
   - Initial page load time
   - API response times
   - Total data transferred
   - Memory usage

**Expected Results**:
- Page loads within 3 seconds
- API responses under 2 seconds
- Smooth scrolling and interactions

### Scenario 2: Pagination Performance

**Objective**: Test pagination with different page sizes

**Steps**:
1. Open AI Usage Logs table
2. Test different page sizes (20, 50, 100)
3. Navigate through multiple pages
4. Monitor:
   - Page change response time
   - UI responsiveness during loading
   - Memory usage over time

**Test Cases**:
- First page (offset 0)
- Middle pages (offset 1000, 5000)
- Last pages (offset 10000+)
- Page size changes

### Scenario 3: Filtering Performance

**Objective**: Test filtering performance with various combinations

**Steps**:
1. Apply different filter combinations
2. Monitor response times
3. Test filter clearing

**Filter Combinations**:
- Date range filters (last 30 days, last year)
- Operation type filters (single and multiple)
- Success status filters
- User-specific filters
- Combined filters

### Scenario 4: Real-time Updates

**Objective**: Test performance during data refresh

**Steps**:
1. Open AI Usage page
2. Click "Refresh" button multiple times
3. Monitor:
   - Loading states
   - UI blocking
   - Memory leaks

### Scenario 5: Browser Performance

**Objective**: Test browser performance with large datasets

**Steps**:
1. Open Performance tab in DevTools
2. Record performance while:
   - Scrolling through table
   - Changing pages
   - Applying filters
   - Refreshing data

**Monitor**:
- Frame rate (should stay above 30fps)
- Memory usage (should not continuously increase)
- CPU usage
- Layout thrashing

## Performance Metrics to Track

### API Performance
- **Response Time**: < 2 seconds for most requests
- **Data Size**: Monitor payload sizes
- **Error Rate**: Should be 0% for valid requests
- **Concurrent Requests**: Test multiple simultaneous requests

### Frontend Performance
- **First Contentful Paint**: < 1.5 seconds
- **Largest Contentful Paint**: < 2.5 seconds
- **Time to Interactive**: < 3 seconds
- **Cumulative Layout Shift**: < 0.1

### User Experience
- **Loading States**: Clear feedback during data loading
- **Smooth Scrolling**: No janky scrolling
- **Responsive UI**: No blocking during operations
- **Error Handling**: Graceful error messages

## Performance Optimization Checklist

### Backend Optimizations
- [ ] Database indexes on frequently queried columns
- [ ] Query optimization for large datasets
- [ ] Pagination limits (max 100 records per request)
- [ ] Caching for statistics endpoints
- [ ] Connection pooling

### Frontend Optimizations
- [ ] Virtual scrolling for large tables
- [ ] Debounced search/filter inputs
- [ ] Lazy loading of non-critical components
- [ ] Memoization of expensive calculations
- [ ] Efficient re-rendering strategies

## Common Performance Issues

### 1. Slow API Responses
**Symptoms**: Long loading times, timeout errors
**Solutions**:
- Check database indexes
- Optimize SQL queries
- Implement caching
- Increase pagination limits

### 2. UI Blocking
**Symptoms**: Frozen interface during operations
**Solutions**:
- Implement loading states
- Use async/await properly
- Debounce user inputs
- Optimize re-rendering

### 3. Memory Leaks
**Symptoms**: Increasing memory usage over time
**Solutions**:
- Clean up event listeners
- Clear intervals/timeouts
- Remove unused references
- Use React.memo appropriately

### 4. Poor Scrolling Performance
**Symptoms**: Janky scrolling, low frame rate
**Solutions**:
- Implement virtual scrolling
- Reduce DOM complexity
- Optimize CSS animations
- Use will-change property

## Testing Tools

### Browser DevTools
- **Network Tab**: Monitor API calls and response times
- **Performance Tab**: Record and analyze performance
- **Memory Tab**: Track memory usage and leaks
- **Console**: Monitor errors and warnings

### External Tools
- **Lighthouse**: Automated performance auditing
- **WebPageTest**: Detailed performance analysis
- **Chrome DevTools**: Advanced debugging features

## Performance Benchmarks

### Acceptable Performance
- Page load: < 3 seconds
- API response: < 2 seconds
- Page change: < 1 second
- Filter application: < 1 second
- Memory usage: < 100MB for 10k records

### Excellent Performance
- Page load: < 1.5 seconds
- API response: < 1 second
- Page change: < 500ms
- Filter application: < 500ms
- Memory usage: < 50MB for 10k records

## Reporting Issues

When reporting performance issues, include:
1. **Test scenario** and steps to reproduce
2. **Performance metrics** (response times, memory usage)
3. **Browser and version**
4. **Data size** (number of records)
5. **Screenshots** of DevTools performance tab
6. **Console errors** or warnings

## Continuous Monitoring

Set up monitoring for:
- API response times
- Error rates
- User experience metrics
- Database performance
- Memory usage trends

This ensures performance remains optimal as the application scales.
