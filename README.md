# SokoTrack – Kenya Stock Portfolio Management

SokoTrack is a web-based stock portfolio management application designed around the Nairobi Securities Exchange (NSE). It helps users record stock prices, track their investments, monitor transactions and analyse portfolio performance.

**Live Demo:** https://nse-portfolio-tracker-ruddy.vercel.app/

## Features

- **Stock Management:** Register and manage stock counters.
- **Daily Price Tracking:** Record daily stock prices and trading volumes.
- **Purchase Tracking:** Record purchased shares, purchase prices and dates.
- **Sales Tracking:** Record sold shares and monitor realised profit or loss.
- **Portfolio Dashboard:** View portfolio value, investment costs and overall performance.
- **Analytics:** Visualise stock price movements, trading volumes and portfolio distribution.
- **Data Validation:** Validate stock prices, transactions and share quantities.

## Technology Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- PostgreSQL (Neon)
- Prisma ORM
- Recharts
- Vercel

## Application Architecture

The application follows a structured flow:

1. Frontend – Displays the user interface and collects input.
2. API Routes – Handle requests and validate incoming data.
3. Prisma ORM – Manages database operations.
4. Neon PostgreSQL – Stores application data.
5. Dashboard and Analytics – Present portfolio information and visualisations.

## Database Structure

The application uses three main models:

- **Stock:** Stores registered stock counters.
- **DailyPrice:** Stores daily stock price and volume records.
- **Transaction:** Stores purchase and sale transactions.

## Profit and Loss Calculation

SokoTrack uses a weighted average cost approach to calculate the cost basis of shares sold.

For example:

- Purchase: 40 shares at KES 15 = KES 600.
- Sale: 20 shares at KES 18 = KES 360.
- Cost basis of shares sold = KES 300.
- Realised profit = KES 60.

*This example excludes transaction fees and taxes.*

## Getting Started

### Prerequisites

- Node.js
- npm
- PostgreSQL database

### Installation

Clone the repository:

```bash
git clone https://github.com/njerii-dev/nse-portfolio-tracker.git
```

Navigate into the project:

```bash
cd nse-portfolio-tracker
```

Install dependencies:

```bash
npm install
```

Configure your environment variables in a local `.env` file using the variable names required by the project:

```env
DATABASE_URL="your_database_url"
DIRECT_URL="your_direct_database_url"
```

Run the development server:

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

*Follow the project's Prisma configuration for any required database setup or migration commands.*

## Current Limitations

- Daily stock prices are entered manually.
- The application does not execute real stock trades.
- Authentication is not currently implemented.
- Transaction fees and taxes are not included in profit and loss calculations.
- Any demonstration data should not be treated as verified live NSE market data.

## Future Improvements

- Integration with an authorised live NSE market data provider.
- User authentication and account management.
- Multiple portfolio support.
- Transaction fee and tax calculations.
- Additional portfolio reporting features.

## Author

**Joyce Njeri**

- GitHub: https://github.com/njerii-dev
- Portfolio: https://portfolio-tawny-one-29.vercel.app/

---

*Developed as a practical project exploring full-stack web development, database management and financial data visualisation.*
