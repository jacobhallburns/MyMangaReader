# MyMangaReader
A website for keeping track of manga read, and finding related manga


## Tools we are using

[Gazu](https://gazu.cg-wire.com/) <br>
[Kitsu](https://api-docs.kitsu.cloud/) <br>
[Next.js](https://nextjs.org/) <br>
[Node.js](https://nodejs.org/en) <br>

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
Backend <br>
```http://localhost:5000/``` <br>