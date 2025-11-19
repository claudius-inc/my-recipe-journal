# Cloudflare R2 Setup Guide

This guide will help you configure Cloudflare R2 for photo storage in your Recipe Journal app.

## Why R2?

- **10 GB free storage** (enough for 5,000-10,000 recipe photos)
- **Zero egress fees** (unlimited photo views at no cost)
- **S3-compatible API** (easy to use, well-documented)
- **Fast global CDN** (images load quickly worldwide)

## Step 1: Create Cloudflare Account

1. Go to [cloudflare.com](https://cloudflare.com)
2. Sign up for a free account
3. Verify your email address

## Step 2: Enable R2

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **R2** in the left sidebar
3. Click **Purchase R2** (don't worry, the free tier is automatic)
4. Accept the terms

## Step 3: Create an R2 Bucket

1. In the R2 section, click **Create bucket**
2. Choose a bucket name (e.g., `recipe-photos`)
   - Must be globally unique
   - Use lowercase, numbers, and hyphens only
3. Select your region (choose closest to your users)
4. Click **Create bucket**

## Step 4: Configure Public Access

### Option A: Custom Domain (Recommended for Production)

1. In your bucket settings, click **Settings** tab
2. Under **Public Access**, click **Connect Domain**
3. Enter your domain (e.g., `photos.yourdomain.com`)
4. Follow the DNS configuration instructions
5. Wait for DNS propagation (~5-10 minutes)

### Option B: R2.dev Domain (Quick Setup)

1. In your bucket settings, click **Settings** tab
2. Under **Public Access**, enable **R2.dev subdomain**
3. Copy the provided URL (e.g., `https://pub-xyz123.r2.dev`)

## Step 5: Create API Token

1. Go to **R2** → **Manage R2 API Tokens**
2. Click **Create API token**
3. Configure the token:
   - **Token name**: `recipe-journal-uploads`
   - **Permissions**:
     - ✅ Object Read
     - ✅ Object Write
     - ✅ Object Delete
   - **TTL**: Never expire (or set your preference)
   - **Bucket scope**: Select your bucket
4. Click **Create API Token**
5. **IMPORTANT**: Copy and save these values immediately:
   - Access Key ID
   - Secret Access Key
   - Jurisdiction-specific endpoints (if shown)

## Step 6: Get Your Account ID

1. In the Cloudflare Dashboard, click on **R2**
2. On the right side, find your **Account ID**
3. Copy this ID (it looks like: `a1b2c3d4e5f6g7h8i9j0`)

## Step 7: Configure Environment Variables

Add these to your `.env` file:

```env
# Cloudflare R2 Configuration
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
R2_ACCESS_KEY_ID=your_access_key_id_here
R2_SECRET_ACCESS_KEY=your_secret_access_key_here
R2_BUCKET_NAME=recipe-photos
R2_PUBLIC_URL=https://photos.yourdomain.com
# OR if using R2.dev:
# R2_PUBLIC_URL=https://pub-xyz123.r2.dev
```

**Important Notes:**

- Never commit your `.env` file to git
- Add `.env` to your `.gitignore` file
- For production (Vercel/etc), add these as environment variables in your hosting platform

## Step 8: Test the Integration

1. Restart your development server:

   ```bash
   npm run dev
   ```

2. Create a recipe and upload a photo
3. Check the browser console for any errors
4. Verify the photo appears correctly
5. Delete the photo and confirm it's removed from R2

## Troubleshooting

### "R2 is not configured" error

- Double-check all environment variables are set correctly
- Make sure there are no extra spaces in your `.env` file
- Restart your dev server after changing environment variables

### "Failed to generate upload URL" error

- Verify your API token has the correct permissions
- Check that your bucket name matches exactly
- Confirm your Account ID is correct

### Photo uploads but doesn't display

- Check your R2_PUBLIC_URL is correct
- If using custom domain, verify DNS is configured
- Ensure public access is enabled on your bucket

### CORS errors when uploading

- In your bucket settings, add CORS rules:
  ```json
  [
    {
      "AllowedOrigins": ["http://localhost:3000", "https://your-production-domain.com"],
      "AllowedMethods": ["GET", "PUT"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3600
    }
  ]
  ```

## Fallback Behavior

If R2 is not configured (environment variables are empty), the app will automatically fall back to Base64 database storage. This allows you to:

- Develop locally without R2 setup
- Deploy to staging without R2 costs
- Migrate to R2 gradually

## Production Deployment

### Vercel

1. Go to your project settings
2. Navigate to **Environment Variables**
3. Add all R2 environment variables
4. Redeploy your application

### Other Platforms

Follow your platform's guide for setting environment variables.

## Monitoring Usage

1. Go to **R2** → **Metrics** in your Cloudflare dashboard
2. Monitor:
   - Storage usage (10 GB free)
   - Class A operations (1M/month free)
   - Class B operations (10M/month free)

## Cost Estimates

With the free tier:

- **Up to 10 GB**: $0
- **Beyond 10 GB**: ~$0.015/GB/month (~$1.50 for 100 GB)
- **Egress**: Always $0 (unlimited!)

For a personal recipe app with 500 photos (~1 GB), you'll likely stay on the free tier forever.

## Security Best Practices

1. **Never expose credentials**: Keep your API keys in environment variables
2. **Use presigned URLs**: The app uses presigned URLs so your keys never leave the server
3. **Rotate keys**: Periodically create new API tokens and delete old ones
4. **Monitor access**: Check R2 logs for unexpected usage

## Need Help?

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [R2 Pricing Calculator](https://developers.cloudflare.com/r2/platform/pricing/)
- [R2 Community Forum](https://community.cloudflare.com/c/r2/)
