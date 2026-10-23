# zexovadigital

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

### Admin project images

Admin project image uploads use the private Supabase `project-images` bucket.
If it does not exist in the connected Supabase project, apply
[`0003_project_image_bucket.sql`](./drizzle/migrations/0003_project_image_bucket.sql)
in the Supabase SQL Editor. The migration creates the private, image-only bucket
and admin-only storage policies.

### Enquiry email notifications

Enquiries are emailed directly through the Resend API (they are not saved in
the database or shown in the admin Enquiries page). Add
these server-side values to your local `.env` file to enable email delivery:

```dotenv
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=enquiries@your-verified-domain.com
```

For local development, the app uses Resend's `onboarding@resend.dev` test sender
when `RESEND_FROM_EMAIL` is not set. Resend only permits test sends to the email
address registered to your Resend account. For production, set
`RESEND_FROM_EMAIL` to an address on a domain verified in Resend. Keep these
values server-side; do not prefix them with `VITE_` or commit them. If email
delivery is not configured or fails, the form reports that the message could not
be sent.

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
