# Email Configuration Guide

This project supports two email providers: **Gmail with Nodemailer** (default) and **Resend**. You can switch between them using an environment variable.

## Environment Variables

### Switching Email Providers

Add this to your `.env` file:

```bash
# Email Provider Configuration
# Options: 'gmail' (default) or 'resend'
EMAIL_PROVIDER=gmail
```

To use Resend instead:
```bash
EMAIL_PROVIDER=resend
```

---

## Gmail Configuration (Default)

If using Gmail (or if `EMAIL_PROVIDER` is not set), you need:

```bash
# Gmail SMTP Configuration
GMAIL_USER=your-email@gmail.com
GMAIL_PASS=your-app-specific-password
GMAIL_FROM_NAME=Massibec Financement
```

### How to get Gmail App Password:
1. Go to your Google Account settings
2. Navigate to Security > 2-Step Verification
3. Scroll to "App passwords" at the bottom
4. Generate a new app password for "Mail"
5. Use that 16-character password as `GMAIL_PASS`

---

## Resend Configuration

If using Resend (`EMAIL_PROVIDER=resend`), you need:

```bash
# Resend Configuration
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=onboarding@yourdomain.com

# Optional: Reuses Gmail settings for display name
GMAIL_FROM_NAME=Massibec Financement
```

### How to get Resend API Key:
1. Sign up at [resend.com](https://resend.com)
2. Go to API Keys in your dashboard
3. Create a new API key
4. Add it to your `.env` file

### Domain Setup for Resend:
- For testing: Use `onboarding@resend.dev` (no domain verification needed)
- For production: 
  1. Add and verify your domain in Resend dashboard
  2. Set `RESEND_FROM_EMAIL=noreply@yourdomain.com`

---

## Complete `.env` Example

### Using Gmail (Default):
```bash
# Email Configuration
EMAIL_PROVIDER=gmail
GMAIL_USER=notifications@massibec.com
GMAIL_PASS=abcd efgh ijkl mnop
GMAIL_FROM_NAME=Massibec Financement
```

### Using Resend:
```bash
# Email Configuration
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_123456789abcdefghijk
RESEND_FROM_EMAIL=noreply@massibec.com
GMAIL_FROM_NAME=Massibec Financement
```

---

## Email Functions Available

The following email functions are available and will automatically use the configured provider:

1. **`sendVerificationEmail`** - Email verification for new users
2. **`sendPasswordResetEmail`** - Password reset emails
3. **`sendEmail`** - Order confirmation emails
4. **`sendDeletionEmail`** - Order deletion notifications
5. **`sendStudentOrderEmail`** - Student order confirmations
6. **`sendSaleNotificationEmail`** - Sale notifications to students

---

## Testing

You can test the email configuration by:

1. Setting up your `.env` file with the appropriate provider
2. Starting your development server: `npm run dev`
3. Testing user registration (sends verification email)
4. Checking server console logs for email provider being used:
   - `📧 Using Gmail for verification email`
   - `📧 Using Resend for verification email`

---

## Troubleshooting

### Gmail Issues:
- **"Invalid credentials"**: Make sure you're using an App Password, not your regular password
- **"Less secure app"**: Enable 2-Step Verification and use App Passwords
- **Emails not sending**: Check Gmail's daily sending limits (500 emails/day for free accounts)

### Resend Issues:
- **"Domain not verified"**: Use `onboarding@resend.dev` for testing or verify your domain
- **"Invalid API key"**: Double-check your API key in Resend dashboard
- **Rate limits**: Free tier has limits - check your Resend dashboard

---

## Migration Guide

### Switching from Gmail to Resend:

1. Sign up for Resend and get your API key
2. Update your `.env`:
   ```bash
   EMAIL_PROVIDER=resend
   RESEND_API_KEY=your_api_key
   RESEND_FROM_EMAIL=onboarding@resend.dev  # For testing
   ```
3. Restart your server
4. Test an email function
5. Check logs to confirm Resend is being used

### Switching back to Gmail:

1. Update your `.env`:
   ```bash
   EMAIL_PROVIDER=gmail
   ```
2. Restart your server
3. Emails will now use Gmail again

---

## Benefits of Each Provider

### Gmail (Nodemailer):
- ✅ Free for low-volume sending
- ✅ Familiar and easy to set up
- ✅ No additional service signup needed
- ❌ Daily sending limits (500/day)
- ❌ Less reliable for production
- ❌ Can be blocked or flagged as spam

### Resend:
- ✅ Built for developers and transactional emails
- ✅ Better deliverability
- ✅ Higher rate limits
- ✅ Better analytics and tracking
- ✅ Scales with your application
- ❌ Requires domain verification for production
- ❌ Paid after free tier (3,000 emails/month free)

---

## Notes

- No code changes are required to switch providers - just update `.env`
- All existing email templates work with both providers
- Both providers use the same React email templates
- Email logs will show which provider is being used

