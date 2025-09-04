# Authentication System Remediation Plan

## CRITICAL - Execute Immediately

### Phase 1: Supabase Dashboard Configuration (Priority: CRITICAL)

#### 1.1 Configure Email Authentication Settings
**Action Required**: Access Supabase Dashboard → Authentication → Settings

1. **Email Confirmation Setting**:
   - Go to `https://supabase.com/dashboard/project/dhiznegwoezqmdoutjss/auth/users`
   - Navigate to "Email" tab in Authentication settings
   - **DECISION POINT**: Choose one:
     - **Option A** (Recommended for immediate fix): **DISABLE** "Confirm email" to allow instant signups
     - **Option B** (Production-ready): Keep enabled but configure SMTP (see 1.2)

2. **Site URL Configuration**:
   - Set Site URL to: `http://localhost:3000` (development)
   - Add production URL when deploying
   - Set Redirect URLs: 
     - `http://localhost:3000/dashboard`
     - `http://localhost:3000/auth/callback`

#### 1.2 Configure SMTP Email Provider (If email confirmation enabled)
**Options in order of recommendation**:

1. **Resend** (Recommended):
   ```
   SMTP Host: smtp.resend.com
   SMTP Port: 587
   SMTP User: resend
   SMTP Password: [Your Resend API key]
   ```

2. **SendGrid**:
   ```
   SMTP Host: smtp.sendgrid.net
   SMTP Port: 587
   SMTP User: apikey
   SMTP Password: [Your SendGrid API key]
   ```

3. **Gmail** (Development only):
   ```
   SMTP Host: smtp.gmail.com
   SMTP Port: 587
   SMTP User: [your-email@gmail.com]
   SMTP Password: [app-specific password]
   ```

#### 1.3 Configure Google OAuth Provider
1. Access Google Cloud Console: `https://console.cloud.google.com/`
2. Navigate to APIs & Services → Credentials
3. Create OAuth 2.0 Client ID:
   - **Authorized JavaScript origins**: `http://localhost:3000`
   - **Authorized redirect URIs**: 
     - `https://dhiznegwoezqmdoutjss.supabase.co/auth/v1/callback`
4. Copy Client ID and Client Secret to Supabase Dashboard → Authentication → Providers → Google

### Phase 2: Database Schema and RLS Policies (Priority: HIGH)

#### 2.1 Create User Profiles Table
Execute in Supabase SQL Editor:

```sql
-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  website TEXT,
  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public profiles are viewable by everyone." ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile." ON profiles
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update own profile." ON profiles
  FOR UPDATE USING ((SELECT auth.uid()) = id);

-- Set up Realtime (optional)
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

### Phase 3: Code Updates (Priority: MEDIUM)

#### 3.1 Update Authentication Context for Email Confirmation

**File**: `/Users/khal1dx/Desktop/khal1dx/vscode/Prompt studio/my-app/prompt-studio/src/contexts/AuthContext.tsx`

Add email confirmation handling:

```typescript
const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  
  // Handle email confirmation case
  if (data?.user && !data?.session) {
    // User created but needs email confirmation
    console.log('Please check your email for confirmation link')
  }
  
  return { error, data }
}
```

#### 3.2 Add Email Confirmation Handler Page

**Create**: `/Users/khal1dx/Desktop/khal1dx/vscode/Prompt studio/my-app/prompt-studio/src/app/auth/callback/route.ts`

```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    await supabase.auth.exchangeCodeForSession(code)
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
}
```

### Phase 4: Testing and Verification (Priority: HIGH)

#### 4.1 Test Registration Flow
1. Start development server: `npm run dev`
2. Navigate to signup page
3. Enter test email and password
4. Verify behavior based on email confirmation setting:
   - **If disabled**: Should redirect immediately to dashboard
   - **If enabled**: Should show "check email" message

#### 4.2 Test Email Delivery (If SMTP configured)
1. Use a real email address for testing
2. Check spam folder
3. Verify email contains correct redirect URL
4. Test email confirmation link

#### 4.3 Test Google OAuth
1. Navigate to login page
2. Click "Continue with Google"
3. Complete Google OAuth flow
4. Verify redirect to dashboard

#### 4.4 Test Database Access
1. After successful authentication, verify user can:
   - Access protected pages
   - Make authenticated API calls
   - Access user profile data

### Phase 5: Environment Variables Update (If SMTP configured)

Add to `.env.local`:
```bash
# Email Configuration (if using custom SMTP)
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=your_api_key

# OAuth Configuration (if needed)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## Immediate Next Steps Checklist

- [ ] 1. Access Supabase Dashboard and configure email settings
- [ ] 2. Set up SMTP provider OR disable email confirmation
- [ ] 3. Configure Google OAuth in Google Cloud Console
- [ ] 4. Add Google OAuth credentials to Supabase Dashboard
- [ ] 5. Execute SQL commands to create RLS policies
- [ ] 6. Test registration with new email
- [ ] 7. Test Google OAuth login
- [ ] 8. Verify database access works

## Expected Resolution Time

- **Phase 1**: 15-30 minutes (Dashboard configuration)
- **Phase 2**: 10-15 minutes (Database setup)
- **Phase 3**: 30-45 minutes (Code updates, if needed)
- **Phase 4**: 15-20 minutes (Testing)

**Total estimated time**: 70-110 minutes for complete resolution

## Success Criteria

✅ New users can successfully register and access the application  
✅ Email confirmations are sent and received (if enabled)  
✅ Google OAuth login functions properly  
✅ Users can access protected pages after authentication  
✅ Database operations work for authenticated users

## Post-Resolution Monitoring

1. Monitor authentication success rates
2. Check email delivery rates
3. Verify OAuth provider stability
4. Monitor database query performance
5. Track user registration completion rates