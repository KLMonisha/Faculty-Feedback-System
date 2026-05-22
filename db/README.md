# Database Configuration

## PostgreSQL

### Setup

1. Create the database:
   ```bash
   createdb faculty_feedback
   ```

2. Run the schema migration:
   ```bash
   psql -d faculty_feedback -f schema/001_init.sql
   ```

3. (Optional) Load seed data:
   ```bash
   psql -d faculty_feedback -f schema/002_seed.sql
   ```

### Schema

- **users** — Students, faculty, and admins
- **courses** — Course catalog
- **faculty_courses** — Faculty ↔ Course mapping
- **feedback** — Student feedback entries
- **analysis_results** — AI sentiment analysis output

## Redis

### Setup

Start Redis with the provided config:
```bash
redis-server redis/redis.conf
```

### Usage

Redis is used for:
- Session caching
- Rate limiting
- AI analysis job queue
