"""
Pydantic models for dictionary entries.
"""
from pydantic import BaseModel


class EntryDataEng(BaseModel):
    word: str
    definition: str


class Entry(BaseModel):
    key: str
    data: list[EntryDataEng]
