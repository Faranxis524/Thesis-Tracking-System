# Firebase Emulator Setup

## Quick Start

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize project (if not already done)
firebase init

# Select:
# - Firestore
# - Functions
# - Emulator Suite

# Start emulators
firebase emulators:start
```

## Emulator Configuration

### firebase.json
```json
{
  "emulators": {
    "auth": {
      "port": 9099
    },
    "functions": {
      "port": 5001
    },
    "firestore": {
      "port": 8080
    },
    "hosting": {
      "port": 5000
    },
    "storage": {
      "port": 9199
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": {
    "source": "functions"
  }
}
```

## Development Workflow

### 1. Start Emulators
```bash
firebase emulators:start --import=./test-data
```

### 2. Initialize Firebase in App
```typescript
import { initializeApp, connectFirestoreEmulator, connectAuthEmulator, connectFunctionsEmulator } from 'firebase/app';

const app = initializeApp(firebaseConfig);

if (process.env.NODE_ENV === 'development') {
  connectFirestoreEmulator(app, 'localhost', 8080);
  connectAuthEmulator(app, 'localhost', 9099);
  connectFunctionsEmulator(app, 'localhost', 5001);
}
```

### 3. Run Tests
```bash
# Unit tests
npm run test

# Integration tests with emulators
npm run test:integration
```

## Seed Data

### Create Test Users
```typescript
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

const auth = getAuth();

// Create leader
await createUserWithEmailAndPassword(
  auth,
  'leader@test.com',
  'password123'
);

// Create teacher
await createUserWithEmailAndPassword(
  auth,
  'teacher@test.com',
  'password123'
);
```

### Seed Firestore
```typescript
import { getFirestore, setDoc, doc } from 'firebase/firestore';

const db = getFirestore();

// Create term
await setDoc(doc(db, 'terms', 'term1'), {
  name: 'Spring 2024',
  startsOn: new Date('2024-01-15'),
  endsOn: new Date('2024-05-15'),
  isActive: true,
  createdAt: new Date()
});

// Create college
await setDoc(doc(db, 'colleges', 'college1'), {
  name: 'College of Engineering',
  createdAt: new Date()
});
```

## Export/Import Data

### Export Current State
```bash
firebase emulators:export ./test-data
```

### Import Previous State
```bash
firebase emulators:start --import=./test-data
```

## Debugging

### View Emulator Logs
```bash
firebase emulators:start --debug
```

### Check Firestore Data
- Open Emulator UI: http://localhost:4000
- Navigate to Firestore tab

### Test Security Rules
```bash
# Run rules tests
firebase emulators:exec --only firestore "npm run test:rules"
```

## Common Issues

### 1. Port Already in Use
```bash
# Find process using port
lsof -i :8080

# Kill process
kill -9 <PID>

# Or use different port
firebase emulators:start --port 8081
```

### 2. Functions Not Deploying
```bash
# Check functions code
cd functions
npm install
cd ..

# Redeploy
firebase deploy --only functions
```

### 3. Auth State Not Persisting
```bash
# Clear storage
localStorage.clear()

# Or use private browsing
```

## Best Practices

1. **Always use emulators for development**
   - Faster iteration
   - No cost
   - Easy to reset

2. **Keep seed data separate**
   - Export/import regularly
   - Version control test data

3. **Test security rules**
   - Write unit tests for rules
   - Test all scenarios

4. **Use environment variables**
   - Separate dev/prod configs
   - Don't hardcode values

5. **Monitor emulator usage**
   - Check memory usage
   - Restart if slow

## CI/CD Integration

### GitHub Actions
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install Dependencies
        run: npm install
      
      - name: Install Firebase Emulator
        run: npm install -g firebase-tools
      
      - name: Start Emulators
        run: firebase emulators:exec --only firestore,auth "npm test"
```

## Performance Tips

1. **Limit real-time listeners in tests**
   - Use `getDocs()` instead of `onSnapshot()`

2. **Batch operations**
   - Use `writeBatch()` for multiple writes

3. **Index wisely**
   - Create composite indexes for common queries

4. **Cache results**
   - Use local state management (Zustand)
   - Implement pagination
