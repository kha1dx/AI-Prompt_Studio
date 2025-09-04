# Authentication System Setup Guide

This project includes a complete authentication system built with Next.js 15, React 19, TypeScript, and Supabase.

## Features

- ✅ Email/Password Authentication
- ✅ Google OAuth Integration
- ✅ Protected Routes with Middleware
- ✅ Session Management
- ✅ TypeScript Support
- ✅ Responsive UI with Tailwind CSS
- ✅ Error Handling & Loading States
- ✅ Automatic Redirects

## Project Structure

```
src/
├── components/auth/
│   ├── AuthLayout.tsx         # Shared layout for auth pages
│   ├── AuthForm.tsx           # Reusable form component
│   ├── GoogleAuthButton.tsx   # Google OAuth button
│   └── ProtectedRoute.tsx     # HOC for route protection
├── contexts/
│   └── AuthContext.tsx        # Authentication state management
├── lib/supabase/
│   ├── client.ts              # Browser Supabase client
│   └── server.ts              # Server Supabase client
└── types/
    └── auth.ts                # TypeScript interfaces

app/
├── login/page.tsx             # Login page
├── signup/page.tsx            # Signup page
├── dashboard/page.tsx         # Protected dashboard
├── layout.tsx                 # Root layout with AuthProvider
└── page.tsx                   # Landing page

middleware.ts                  # Route protection middleware
```

## Setup Instructions

### 1. Configure Environment Variables

Update the `.env.local` file with your Supabase project credentials:

```bash
# Get these from your Supabase project settings
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# For production deployments
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret-key
```

### 2. Set Up Supabase Project

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API to get your URL and keys
3. Enable Authentication providers:
   - Go to Authentication > Providers
   - Enable Email provider
   - Configure Google OAuth (optional):
     - Enable Google provider
     - Add your Google OAuth credentials
     - Set redirect URL: `https://your-project.supabase.co/auth/v1/callback`

### 3. Configure Authentication Settings

In your Supabase dashboard:

1. **Authentication > Settings**:
   - Site URL: `http://localhost:3000` (development)
   - Additional redirect URLs: 
     - `http://localhost:3000/dashboard`
     - `https://your-domain.com/dashboard` (production)

2. **Authentication > Email Templates** (Optional):
   - Customize confirmation and recovery email templates

### 4. Set Up Google OAuth (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `https://your-project.supabase.co/auth/v1/callback`
5. Add client ID and secret to Supabase Auth settings

### 5. Run the Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see the authentication system in action.

## Usage

### Authentication Flow

1. **Landing Page** (`/`): Shows sign in/up options for unauthenticated users
2. **Login Page** (`/login`): Email/password login with Google OAuth option
3. **Signup Page** (`/signup`): Account creation with email verification
4. **Dashboard** (`/dashboard`): Protected route showing user information

### Using the Auth Context

```tsx
import { useAuth } from '../src/contexts/AuthContext'

function MyComponent() {
  const { user, loading, signIn, signOut } = useAuth()
  
  if (loading) return <div>Loading...</div>
  
  if (!user) return <div>Please log in</div>
  
  return (
    <div>
      Welcome {user.email}!
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  )
}
```

### Creating Protected Routes

```tsx
import { ProtectedRoute } from '../src/components/auth/ProtectedRoute'

export default function MyProtectedPage() {
  return (
    <ProtectedRoute>
      <div>This content is only visible to authenticated users</div>
    </ProtectedRoute>
  )
}
```

## API Reference

### Auth Context Methods

- `signIn(email, password)` - Sign in with email/password
- `signUp(email, password)` - Create new account
- `signOut()` - Sign out current user
- `signInWithGoogle()` - Sign in with Google OAuth

### Auth State

- `user` - Current user object or null
- `session` - Current session or null
- `loading` - Boolean indicating auth state loading

## Security Features

### Middleware Protection

The middleware automatically:
- Redirects unauthenticated users away from `/dashboard/*`
- Redirects authenticated users away from `/login` and `/signup`
- Maintains session state across requests

### Environment Security

- Secrets are stored in environment variables
- Service role key is only used server-side
- Client only receives anon key (safe for browser)

## Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Update Supabase redirect URLs with your production domain
4. Deploy!

### Environment Variables for Production

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your-production-secret
```

## Troubleshooting

### Common Issues

1. **"Invalid API key"**: Check environment variables are correctly set
2. **OAuth redirect errors**: Ensure redirect URLs match in Supabase settings
3. **Email confirmation issues**: Check email provider settings in Supabase
4. **CORS errors**: Verify site URL settings in Supabase

### Debug Tips

- Check browser network tab for failed requests
- Verify Supabase logs in dashboard
- Ensure middleware is working by checking redirects
- Test authentication in incognito mode

## Customization

### Styling

The components use Tailwind CSS classes. You can:
- Modify component styles directly
- Create custom theme variants
- Replace with your preferred UI library

### Email Templates

Customize authentication emails in Supabase dashboard:
- Confirmation emails
- Password reset emails
- Magic link emails

### OAuth Providers

Add more OAuth providers:
1. Enable in Supabase dashboard
2. Update AuthContext with new sign-in methods
3. Add buttons to auth forms

## Next Steps

- Add user profiles
- Implement role-based access control
- Add password reset functionality
- Create user management dashboard
- Add social login providers (GitHub, Facebook, etc.)