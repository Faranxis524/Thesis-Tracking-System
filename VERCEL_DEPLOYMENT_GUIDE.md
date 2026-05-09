# Vercel Deployment Guide for PNC Thesis Tracker

## Prerequisites

- Vercel account (https://vercel.com)
- GitHub repository with the latest code
- Firebase project configured
- Environment variables ready

## Step 1: Verify Project Structure

Your Next.js project (`web/` folder) should have:
- `package.json` - Dependencies and scripts
- `next.config.ts` - Next.js configuration for the app
- `vercel.json` - Vercel deployment configuration
- `tsconfig.json` - TypeScript configuration
- `src/` - Application source code

## Step 2: Build and Test Locally

```bash
# Navigate to the web directory
cd web

# Install dependencies
npm install

# Build the project
npm run build

# Run tests (if any)
npm run test
```

## Step 3: Deploy to Vercel

### Option A: Deploy via Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy the project:
```bash
cd web
vercel
```

4. Follow the prompts:
- Set up and deploy? Yes
- Which scope? Select your account
- Link to existing project? No (or Yes if creating new)
- What's your project's name? (default is fine)
- In which directory is your code located? ./web

### Option B: Deploy via Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Click "New Project"
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next` (auto-detected)
   - **Root Directory**: `/web`
   - **Install Command**: `npm install`

## Step 4: Configure Environment Variables

In your Vercel dashboard:

1. Go to Project Settings → Environment Variables
2. Add the following variables:

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Your Firebase API key | Production, Preview, Development |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Your Firebase auth domain | Production, Preview, Development |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Your Firebase project ID | Production, Preview, Development |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Your Firebase storage bucket | Production, Preview, Development |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Your Firebase sender ID | Production, Preview, Development |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Your Firebase app ID | Production, Preview, Development |

Also add your Vercel domain in Firebase Authentication → Settings → Authorized domains:
- Your production domain, for example `your-project.vercel.app`
- Any custom domain you connect later

## Step 5: Deploy Firebase Functions Separately

Vercel deploys the Next.js frontend. Firebase Cloud Functions need to be deployed separately:

```bash
# Ensure you're in the project root
cd /path/to/thesis-tracker-system

# Deploy Firebase functions
firebase deploy --only functions

# Deploy Firestore rules and indexes
firebase deploy --only firestore:rules,firestore:indexes
```

## Step 6: Verify Deployment

1. Visit your Vercel deployment URL (e.g., `https://your-project.vercel.app`)
2. Check the browser console for any Firebase initialization errors
3. Test authentication and key features
4. Verify Firebase Functions are being called correctly

## Step 7: Configure Custom Domain (Optional)

1. In Vercel dashboard, go to Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. Wait for propagation (up to 48 hours)

## Step 8: Set Up CI/CD (Optional)

For automatic deployments on Git push:

1. In Vercel, go to Project Settings → Git
2. Connect your GitHub repository
3. Configure deployment triggers:
   - Deploy on push to main branch
   - Deploy on pull request (preview deployments)

## Troubleshooting

### Build Failures
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify TypeScript compiles without errors (`npm run build`)
- Make sure the Vercel project root is set to `web`

### Firebase Connection Issues
- Verify environment variables are set correctly
- Check Firebase console for quota limits
- Ensure Firebase API is enabled
- Confirm the Firebase Auth authorized domains include your Vercel domain

### CORS Issues
- Add your Vercel domains to Firebase Auth authorized domains
- Configure CORS in Firebase Functions if needed

### Performance Issues
- Enable Vercel's Edge Network
- Configure ISR (Incremental Static Regeneration)
- Optimize images and assets

## Post-Deployment Checklist

- [ ] Frontend deployed to Vercel
- [ ] Environment variables configured
- [ ] Firebase Functions deployed
- [ ] Firestore rules and indexes deployed
- [ ] Firebase Auth authorized domains updated
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active
- [ ] CI/CD pipeline configured
- [ ] Monitoring and alerts set up
- [ ] Backup strategy implemented

## Monitoring

- [Vercel Analytics](https://vercel.com/docs/analytics)
- [Firebase Performance Monitoring](https://firebase.google.com/docs/performance)
- [Firebase Crashlytics](https://firebase.google.com/docs/crashlytics)

## Rollback

To rollback to a previous deployment:

1. In Vercel dashboard, go to Deployments
2. Find the previous successful deployment
3. Click "Revert"

For Firebase functions:
```bash
firebase deploy --only functions --force
```

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Firebase Hosting + Cloud Functions](https://firebase.google.com/docs/hosting)
- [Environment Variables in Next.js](https://nextjs.org/docs/basic-features/environment-variables)

---

**Created**: 2026-05-05
**Last Updated**: 2026-05-05
**Status**: 🚀 Ready for Deployment