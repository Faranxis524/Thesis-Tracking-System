# Firebase Deployment Checklist

## Pre-Deployment

- [ ] Firebase project created
- [ ] Billing enabled
- [ ] Project ID configured
- [ ] Environment variables set
- [ ] Security rules reviewed
- [ ] Cloud Functions tested locally
- [ ] Firestore indexes created
- [ ] Custom claims tested
- [ ] Emulators tested successfully
- [ ] Seed data verified
- [ ] Migration script tested

## 1. Deploy Security Rules

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Verify deployment
firebase firestore:rules:get
```

✅ **Done**: Rules deployed successfully

## 2. Deploy Cloud Functions

```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:enforceMemberLimit

# Check logs
firebase functions:log
```

✅ **Done**: Functions deployed successfully

## 3. Deploy Firestore Indexes

```bash
# Deploy indexes
firebase deploy --only firestore:indexes

# Verify indexes
firebase firestore:indexes
```

✅ **Done**: Indexes deployed successfully

## 4. Deploy Hosting

```bash
# Build project
npm run build

# Deploy hosting
firebase deploy --only hosting

# Or deploy with functions
firebase deploy
```

✅ **Done**: Hosting deployed successfully

## 5. Configure Authentication

- [ ] Email templates customized
- [ ] OAuth providers configured (if needed)
- [ ] Custom claims set up
- [ ] Test users created
- [ ] Password reset tested

## 6. Data Seeding (If Needed)

```bash
# Verify data
firebase firestore:get --collection users
```

✅ **Done**: Data seeded successfully

## 7. Environment Configuration

### Local Development (.env.local)
```
NEXT_PUBLIC_FIREBASE_API_KEY=xxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxx
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxx
NEXT_PUBLIC_FIREBASE_APP_ID=xxx
```

### Production (.env.production)
```
NEXT_PUBLIC_FIREBASE_API_KEY=prod-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=prod-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=prod-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=prod-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=prod-sender
NEXT_PUBLIC_FIREBASE_APP_ID=prod-app-id
```

## 8. Post-Deployment Tests

### User Authentication
- [ ] Login works (leader)
- [ ] Login works (teacher)
- [ ] Registration works
- [ ] Password reset works
- [ ] Logout works
- [ ] Session persists

### Leader Features
- [ ] Dashboard loads
- [ ] Defense flow displays
- [ ] Stage progression works
- [ ] Submissions can be made
- [ ] Group can be created
- [ ] Members can be added

### Teacher Features
- [ ] Dashboard loads
- [ ] All groups visible
- [ ] Submissions can be reviewed
- [ ] Approvals work
- [ ] Revisions can be requested
- [ ] Defenses can be scheduled

### Security
- [ ] Leaders can't access teacher-only routes
- [ ] Teachers can't access leader-only routes
- [ ] Unauthorized access blocked
- [ ] Data isolation works
- [ ] Submissions can't be tampered with

## 9. Monitoring Setup

### Firebase Console
- [ ] Functions monitoring
- [ ] Firestore usage
- [ ] Auth monitoring
- [ ] Performance monitoring
- [ ] Crashlytics (if enabled)

### Alerts
- [ ] Function errors alert
- [ ] High latency alert
- [ ] Auth failures alert
- [ ] Firestore quota alert

## 10. Rollback Plan

### If Critical Issues
1. Switch DNS to old version
2. Keep Firebase running
3. Fix issues
4. Redeploy

### Data Rollback
```bash
# Import backup
firebase firestore:import gs://your-bucket/backup
```

## 11. Performance Checks

- [ ] Page load times < 3 seconds
- [ ] API response times < 500ms
- [ ] No memory leaks
- [ ] Efficient queries
- [ ] Proper indexing
- [ ] Cache working

## 12. Documentation

- [ ] Deployment log updated
- [ ] Issues documented
- [ ] Solutions recorded
- [ ] Future improvements noted

## 13. Team Notification

- [ ] Team notified of deployment
- [ ] Documentation shared
- [ ] Training provided
- [ ] Feedback collected

## 14. Final Verification

### Smoke Tests
```bash
# Test critical paths
npm run test:smoke
```

### Load Tests
```bash
# Test with multiple users
npm run test:load
```

✅ **All tests passed**

## Deployment Complete!

**URL**: https://your-project.web.app  
**Dashboard**: https://console.firebase.google.com  
**Status**: 🟢 Production Ready
