# Deployment Guide

## Environment Variables

### Required for Production

Set these environment variables in your Vercel project settings:

#### Database Configuration

```bash
DATABASE_URL=your_postgresql_connection_string
```

#### Better Auth Configuration

```bash
# CRITICAL: Must match your production domain
BETTER_AUTH_URL=https://your-app.vercel.app
NEXT_PUBLIC_BETTER_AUTH_URL=https://your-app.vercel.app

# Generate with: openssl rand -hex 32
BETTER_AUTH_SECRET=your_secure_random_string
```

#### Email Configuration (Resend)

```bash
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL="Your App <noreply@yourdomain.com>"
```

#### Optional: Photo Extraction

```bash
GEMINI_API_KEY=your_gemini_api_key
```

### Common Issues

#### 1. Magic Link Authentication Not Working

**Symptom:** After clicking the magic link, user is not logged in, session cookie not set.

**Cause:** `BETTER_AUTH_URL` and `NEXT_PUBLIC_BETTER_AUTH_URL` are set to `localhost` instead of production domain.

**Solution:**

1. Go to Vercel Project Settings → Environment Variables
2. Update `BETTER_AUTH_URL` to `https://your-app.vercel.app`
3. Update `NEXT_PUBLIC_BETTER_AUTH_URL` to `https://your-app.vercel.app`
4. Redeploy the application

#### 2. 401 Unauthorized on API Routes

**Symptom:** API routes return 401 even when logged in locally.

**Cause:** Session cookie domain mismatch or CORS issues.

**Solution:**

- Ensure `BETTER_AUTH_URL` matches your deployment domain exactly
- Check that cookies are not being blocked by browser
- Verify `credentials: "include"` is set in auth client (already configured)

#### 3. Email Not Sending

**Symptom:** Magic link email never arrives.

**Cause:** Resend API key not configured or invalid.

**Solution:**

1. Verify `RESEND_API_KEY` is set in Vercel environment variables
2. Check Resend dashboard for sending limits/errors
3. Ensure `FROM_EMAIL` is a verified domain in Resend

## Database Setup

### Initial Migration

After deploying, run the Prisma migration:

```bash
# From Vercel CLI or in build command
npx prisma migrate deploy
npx prisma generate
```

### Seeding Production Data (Optional)

**WARNING:** The seed script will create sample recipes. Only run this if you want demo data.

```bash
npm run db:seed
```

For production, you typically want to start with an empty database.

## Build Configuration

Vercel automatically detects Next.js projects. Ensure your `package.json` includes:

```json
{
  "scripts": {
    "build": "prisma generate && next build",
    "postinstall": "prisma generate"
  }
}
```

## Vercel Configuration

### Recommended Settings

**Framework Preset:** Next.js

**Build Command:** `npm run build`

**Output Directory:** `.next` (default)

**Install Command:** `npm install`

### Environment Variables by Environment

You can set different values for **Production**, **Preview**, and **Development** branches:

**Production:**

- `BETTER_AUTH_URL=https://my-recipe-journal.vercel.app`
- `NEXT_PUBLIC_BETTER_AUTH_URL=https://my-recipe-journal.vercel.app`

**Preview (optional):**

- `BETTER_AUTH_URL=https://$VERCEL_URL`
- `NEXT_PUBLIC_BETTER_AUTH_URL=https://$VERCEL_URL`

Note: Vercel automatically provides `VERCEL_URL` which contains the preview deployment URL.

## Post-Deployment Checklist

- [ ] Verify `BETTER_AUTH_URL` is set to production domain
- [ ] Test magic link login flow
- [ ] Check that API routes return data (not 401)
- [ ] Verify session persists across page refreshes
- [ ] Test photo extraction feature (if GEMINI_API_KEY is set)
- [ ] Check browser console for CORS or auth errors
- [ ] Test creating/editing recipes
- [ ] Verify database connections work

## Troubleshooting

### Check Vercel Logs

```bash
# Install Vercel CLI
npm i -g vercel

# View logs
vercel logs your-deployment-url
```

### Test Authentication Flow

1. Visit `/login` page
2. Enter email and send magic link
3. Check email inbox (including spam)
4. Click magic link - should redirect to home page
5. Check browser DevTools → Application → Cookies
6. Look for `better-auth.session_token` or `__Secure-better-auth.session_token`

### Database Connection Issues

If you see Prisma connection errors:

1. Verify `DATABASE_URL` is correct
2. Check that database allows connections from Vercel IPs
3. For Neon, ensure connection pooling is enabled
4. Test connection in Vercel function logs

### Cookie Not Setting in Production

Possible causes:

1. **Domain mismatch** - `BETTER_AUTH_URL` doesn't match deployment URL
2. **HTTPS required** - Secure cookies only work over HTTPS (Vercel provides this)
3. **SameSite restrictions** - Already handled by Better Auth
4. **Third-party cookie blocking** - Users may need to allow cookies

## Security Considerations

### Environment Variables

- Never commit `.env` file to git
- Rotate `BETTER_AUTH_SECRET` if exposed
- Use different Resend API keys for production/development
- Keep database credentials secure

### Better Auth Secret

Generate a strong secret:

```bash
openssl rand -hex 32
```

Or use Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Automatic Deployments

Vercel automatically deploys when you push to your repository:

- **Main branch** → Production deployment
- **Other branches** → Preview deployments

Each deployment gets a unique URL for testing before promoting to production.
