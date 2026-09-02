This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment variables

Create a `.env.local` file in the project root and configure:

- `RAKUTEN_APPLICATION_ID`
- `RAKUTEN_ACCESS_KEY`
- `EBAY_CLIENT_ID`
- `EBAY_CLIENT_SECRET`

Amazon search defaults to a free external-search mode. It opens Amazon Japan
using a product name, JAN, or ASIN and does not require a Professional selling
plan or API credentials.

The following variables are optional and reserved for a future in-app Amazon
catalog-search mode:

- `AMAZON_SP_API_CLIENT_ID`
- `AMAZON_SP_API_CLIENT_SECRET`
- `AMAZON_SP_API_REFRESH_TOKEN`

That optional mode uses a self-authorized private Selling Partner API
application. Keep every credential server-side and never prefix these variables
with `NEXT_PUBLIC_`.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
