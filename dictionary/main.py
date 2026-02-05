# api/main.py
import uvicorn
from fastapi import FastAPI, HTTPException
from load_trie import dictionary

app = FastAPI(title="Korean Dictionary API (MARISA-backed)")


@app.get("/lookup/{word}")
def lookup(word: str):
    result = dictionary.lookup(word)
    print(f"lookup({word}) = {result}")
    # if result is None:
    #     raise HTTPException(status_code=404, detail="Word not found")
    return result or {}

@app.get("/random")
def random():
    return dictionary.random()


# @app.get("/prefix/{prefix}")
# def prefix_search(prefix: str, limit: int = 20):
#     return dictionary.prefix_search(prefix, limit=limit)


@app.get("/health")
def health():
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False,  reload_dirs=["."])
