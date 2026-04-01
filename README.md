# dragetech-server

Simple Node.js server to serve the Dragetech website.

## Setup

```bash
npm install
```

## Run

```bash
npm start
```

## Configure

Edit `config.ini`:

```ini
PORT=3001
USER=admin
PASSWORD=yourpassword
```

- Set `USER` and `PASSWORD` to enable admin authentication
- Without credentials, the admin API is open

## How it works

- Serves all files from the project root as static content
- Admin API at `/api/admin/content` saves site content to `data/site-content.js`
- Make sure `data/` directory exists and is writable

## Docker

Build:

```bash
docker build -t dragetech-server .
```

Run:

```bash
docker run --rm -p 3001:3001 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/config.ini:/app/config.ini \
  dragetech-server
```


Mount your website files to `/app` (or copy them into the image).
