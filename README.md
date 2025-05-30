# MyMangaReader
A website for keeping track of manga read, and finding related manga


## Tools we are using

- **Frontend**: [Next.js](https://nextjs.org/)
- **Backend**: [Node.js](https://nodejs.org/en) + [Express](https://expressjs.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) with [Mongoose](https://mongoosejs.com/)
- **API**: [Kitsu API](https://api-docs.kitsu.cloud/)
- **Containerization**: Docker

## Docker Settings:

WSL needs to be enabled for Docker Desktop.<br>

Put this in your Docker Desktop Settings (replace what was in there please) <br>

```
{
  "builder": {
    "gc": {
      "defaultKeepStorage": "20GB",
      "enabled": true
    }
  },
  "dns": [
    "8.8.8.8",
    "1.1.1.1"
  ],
  "experimental": false
}
```
<br>

## Compile Instructions:
Run Docker Desktop and wait for it to say "Docker Desktop is running"<br>

From the ../MyMangaReader/ directory, run the following code: <br>
```docker-compose up --build```
<br>

## Local Host Site
Frontend <br>
```http://localhost:3000/``` <br>
Manga List <br>
```http://localhost:3000/manga-list``` <br>
Backend <br>
```http://localhost:5000/``` <br>
