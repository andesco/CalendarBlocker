# CalendarBlocker

CalendarBlocker helps you block time randomly and quickly, with a .ics calendar feed set to your desired availability.

Using random (but deterministic) blocks of unavailable time, you can quickly populate an otherwise sparse calendar app, including Apple or Google; or randomly limit availability in a scheduling app, including [Cal.com](https://cal.com) and [SavvyCal](https://savvycal.com).

For example, CalendarBlocker in Apple Calendar, set to 1 hour blocks and 50% probability: \
[blocker.andrewe.ca/calendar.ics?h=1&p=0.50](https://blocker.andrewe.ca/calendar.ics?h=1&p=0.50)

<picture style="max-width: 554px; width: 100%; display: block;">
  <source srcset="Calendar-app-dark.png" media="(prefers-color-scheme: dark)">
  <source srcset="Calendar-app-light.png" media="(prefers-color-scheme: light)">
  <img src="Calendar-app-light.png" alt="CalendarBlocker in Apple Calendar with 1 hour blocks and 50% probability"  style="width: 100%; height: auto; display: block;">
</picture>

## Features

- generate a unique `.ics` calendar feed of unavailable time
- deterministic pseudo-random availability based on your seed value, probability, and time block
- time blocks begin each day at midnight (00:00) in the timezone specified

## Add or Subscribe: [blocker.andrewe.ca/calendar](https://blocker.andrewe.ca/calendar.ics)

Add or subscribe to CalendarBlocker in your calendar or scheduling app. You can include the optional `.ics` file extension and set `DAYS`, `HOURS`, and `PROBABILITY` in the URL query:

https://blocker.andrewe.ca/calendar \
https://blocker.andrewe.ca/calendar.ics \
https://blocker.andrewe.ca/calendar.ics?d=7&h=4&p=0.35 \
https://blocker.andrewe.ca/calendar.ics?days=7&hours=4&probability=0.35


## Deploy to Cloudflare

CalendarBlocker is a Cloudflare Worker (serverless function) that generates unique `.ics` calendar feeds.

Deploy your own Cloudflare Worker to change additional settings (using [environment variables](#variables)) including `NAME`, `SEED`, `SEED_VIA_URL`, and `TIMEZONE`,

### Option 1: Deploy to Cloudflare

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/andesco/CalendarBlocker)

### Option 2: Manual Deployment

1. Clone this repo:

```bash
git clone https://github.com/andesco/CalendarBlocker.git
cd CalendarBlocker
```

2. Customize default variables in `wrangler.jsonc` as needed. Example:

```jsonc
{
  "vars": {
    "DAYS": "21",
    "HOURS": "4",
    "PROBABILITY": "0.25",
    "TIMEZONE": "America/Vancouver"
  }
}
```

3.

Install Wrangler CLI, login, and deploy:
: Wrangler is the Cloudflare Developer Platform command-line interface (CLI)

*[CLI]: Hyper Text Markup Language

```bash
npm install -g wrangler
wrangler login
npm run deploy
```

### Personal Deployment

For a private deployment config, create `wrangler.local.jsonc` and deploy with:

```bash
npm run deploy:local
```

## Usage

Add or subscribe to a calendar using your worker subdomain, a custom subdomain, or blocker.andrewe.ca:
 
`https://blocker.username.workers.dev/calendar.ics`

`https://subdomain.personal.com/calendar.ics`

`https://blocker.andrewe.ca/calendar.ics`

Calendar feeds generate consistent blocks of time based on the seed being used. To get a new set of randomized (but deterministic) blocks of time, update your Cloudflare Worker environment variables:

- change the default value of `SEED`; or
- set `SEED_VIA_URL` to `true` and set an optional per-calendar `SEED` in the URL query: `https://subdomain.personal.com/calendar?seed=random-seed-value`
 
 ### Environment Variables
 
 | Variable      | Description                            | Default                  |
 |---------------|----------------------------------------|--------------------------|
 | `DAYS`        | number of days: 1–21                   | `14`                     |
 | `HOURS`       | hours in each block of time: <br /> 0.5, 1, 2, 3, 4, 6, 8, 12, 24 | `3` |
 | `TIMEZONE`    | [IANA timezone identifier][wiki]       | [`America/Toronto`][timeis]    |
 | `NAME`        | calendar/event name displayed in apps  | `CalendarBlocker`        |
 | `PROBABILITY` | probability of a time block: 0.00–1.00 | `0.50`                   |
 | `REDIRECT`    | redirects hostname root                | [`andesco/CalendarBlocker`][github] |
 | `SEED`        | default seed value                     | `default-seed-value`     |
 | `SEED_VIA_URL`| enable setting `SEED` via URL query: <br /> true, false | `false` |
 
### URL Query Parameters

 | Variable         | Description                |
 |------------------|----------------------------|
 | `days` <br> `d`  | number of days: <br/> 1–21 |
 | `hours` <br> `h` | hours in each block of time: <br /> 0.5, 1, 2, 3, 4, 6, 8, 12, 24 | `3` |
 | `probability` <br> `p` | probability of a time block: <br/> 0.00–1.00 |
 | `seed`           | calendar-specific seed value if `SEED_VIA_URL` is true |


   [iana]:  https://www.iana.org/time-zones
   [wiki]:  https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
   [timeis]: https://time.is/Toronto
   [github]: https://github.com/andesco/CalendarBlocker
  
