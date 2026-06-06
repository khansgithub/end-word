# api/main.py
from fastapi import APIRouter, FastAPI
from load_trie import dictionary


def create_app(route_prefix: str = "") -> FastAPI:
    app = FastAPI(title="Korean Dictionary API (MARISA-backed)")
    router = APIRouter(prefix=route_prefix)

    @router.get("/lookup/{word}")
    def lookup(word: str):
        result = dictionary.lookup(word)
        return result or {}

    @router.get("/random")
    def random():
        return dictionary.random()

    @router.get("/health")
    def health():
        return {"status": "ok"}

    app.include_router(router)
    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False, reload_dirs=["."])
