# Can Opener Phantom Bridge

This is a simple web page that acts as a bridge between the Can Opener Chrome extension and the Phantom wallet. It solves the problem where Chrome extensions cannot directly interact with the Phantom wallet due to browser security restrictions.

## How it Works

1. The Can Opener extension opens this page in a new tab
2. This page receives address and amount parameters via the URL
3. The page can directly connect to the Phantom wallet (which isn't possible from a Chrome extension)
4. After the transaction is complete, users can return to the extension

## Deployment Instructions

### Option 1: Deploy with Vercel (Easiest)

1. Create a GitHub repository and push this code to it:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/can-opener-bridge.git
   git push -u origin main
   ```

2. Go to [Vercel](https://vercel.com) and sign up/login with your GitHub account

3. Click "New Project" and import your GitHub repository 

4. No configuration is needed - just click "Deploy"

5. Once deployed, Vercel will give you a URL like `https://can-opener-bridge.vercel.app`

6. Update your extension code to use this URL in the `bridgeUrl` variable in popup.js

### Option 2: Deploy with Netlify

1. Sign up/login to [Netlify](https://netlify.com)

2. Drag and drop the entire `bridge-page` folder onto the Netlify dashboard

3. Netlify will automatically deploy the site and give you a URL

4. Update your extension code with the provided URL

### Option 3: GitHub Pages

1. Push the code to a GitHub repository

2. Go to repository Settings > Pages

3. Enable GitHub Pages and set the source to your main branch

4. Your site will be available at `https://yourusername.github.io/repository-name`

## Customization

- Update the logo URL in the HTML to point to your own logo
- Customize the colors in the CSS section if desired
- The default wallet address is set as a fallback, but the page always uses the address from URL parameters

## Testing

After deployment, test by manually opening your URL with parameters:

```
https://your-deployment-url/?address=84U4Z1E7iYdXjkhBUWgDTAuDEf6LLCGSfg35VmxAE5Eo&amount=0.1
```

This should show the transaction details and allow you to connect to Phantom. 