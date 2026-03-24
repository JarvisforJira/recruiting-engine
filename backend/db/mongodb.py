"""
Database layer using TinyDB (file-based, no server required).
Provides a simple interface that mimics the collection API used throughout the routers.
"""

import os
import uuid
from datetime import datetime, timezone
from tinydb import TinyDB, Query
from tinydb.table import Table

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
os.makedirs(DATA_DIR, exist_ok=True)

_db: TinyDB = None


def _get_db() -> TinyDB:
    global _db
    if _db is None:
        _db = TinyDB(os.path.join(DATA_DIR, "db.json"), indent=2)
    return _db


class Collection:
    """Wraps a TinyDB table to provide a MongoDB-like API."""

    def __init__(self, table: Table):
        self._table = table

    def _serialize_doc(self, doc: dict, doc_id: int) -> dict:
        """Add _id field using stored id or generate from tinydb doc_id."""
        if "_id" not in doc:
            doc["_id"] = doc.get("id", str(doc_id))
        return doc

    def find(self, query: dict = None) -> "CursorLike":
        all_docs = self._table.all()
        results = []
        for doc in all_docs:
            if _matches(doc, query or {}):
                d = dict(doc)
                d["_id"] = d.get("_id", d.get("id", ""))
                results.append(d)
        return CursorLike(results)

    def find_one(self, query: dict) -> dict | None:
        all_docs = self._table.all()
        for doc in all_docs:
            if _matches(doc, query):
                d = dict(doc)
                d["_id"] = d.get("_id", d.get("id", ""))
                return d
        return None

    def insert_one(self, doc: dict) -> "InsertResult":
        if "_id" not in doc:
            doc["_id"] = str(uuid.uuid4())
        self._table.insert(doc)
        return InsertResult(doc["_id"])

    def find_one_and_update(self, query: dict, update: dict, return_document: bool = False) -> dict | None:
        all_docs = self._table.all()
        Q = Query()
        for doc in all_docs:
            if _matches(doc, query):
                set_vals = update.get("$set", {})
                updated = {**doc, **set_vals}
                self._table.update(set_vals, _build_tinydb_query(query))
                updated["_id"] = updated.get("_id", updated.get("id", ""))
                return updated
        return None

    def find_one_and_delete(self, query: dict) -> dict | None:
        doc = self.find_one(query)
        if doc:
            self._table.remove(_build_tinydb_query(query))
        return doc

    def update_one(self, query: dict, update: dict) -> None:
        set_vals = update.get("$set", {})
        self._table.update(set_vals, _build_tinydb_query(query))

    def delete_one(self, query: dict) -> "DeleteResult":
        docs_before = len(self._table.all())
        self._table.remove(_build_tinydb_query(query))
        docs_after = len(self._table.all())
        return DeleteResult(docs_before - docs_after)

    def count_documents(self, query: dict) -> int:
        return len([d for d in self._table.all() if _matches(d, query)])

    def aggregate(self, pipeline: list) -> "CursorLike":
        """Support simple $group aggregations."""
        results = []
        for stage in pipeline:
            if "$group" in stage:
                group_by = stage["$group"]["_id"]
                count_field = None
                for k, v in stage["$group"].items():
                    if k != "_id" and isinstance(v, dict) and "$sum" in v:
                        count_field = k

                counts: dict = {}
                for doc in self._table.all():
                    key = doc.get(group_by.lstrip("$")) if group_by else None
                    counts[key] = counts.get(key, 0) + 1

                results = [{"_id": k, count_field or "count": v} for k, v in counts.items()]
        return CursorLike(results)

    def command(self, cmd: str) -> dict:
        return {"ok": 1}


class CursorLike:
    def __init__(self, docs: list):
        self._docs = docs
        self._sort_key = None
        self._sort_dir = 1
        self._limit_n = None

    def sort(self, key: str, direction: int = 1) -> "CursorLike":
        self._sort_key = key
        self._sort_dir = direction
        return self

    def limit(self, n: int) -> "CursorLike":
        self._limit_n = n
        return self

    def __aiter__(self):
        docs = self._docs
        if self._sort_key:
            reverse = self._sort_dir == -1
            docs = sorted(docs, key=lambda d: (d.get(self._sort_key) is None, d.get(self._sort_key) or 0), reverse=reverse)
        if self._limit_n:
            docs = docs[:self._limit_n]
        return AsyncIterator(docs)

    def __iter__(self):
        docs = self._docs
        if self._sort_key:
            reverse = self._sort_dir == -1
            docs = sorted(docs, key=lambda d: (d.get(self._sort_key) is None, d.get(self._sort_key) or 0), reverse=reverse)
        if self._limit_n:
            docs = docs[:self._limit_n]
        return iter(docs)


class AsyncIterator:
    def __init__(self, docs):
        self._iter = iter(docs)

    def __aiter__(self):
        return self

    async def __anext__(self):
        try:
            return next(self._iter)
        except StopIteration:
            raise StopAsyncIteration


class InsertResult:
    def __init__(self, inserted_id):
        self.inserted_id = inserted_id


class DeleteResult:
    def __init__(self, deleted_count):
        self.deleted_count = deleted_count


def _matches(doc: dict, query: dict) -> bool:
    """Simple query matcher supporting equality, $in, $lt, $gt, $nin."""
    for key, val in query.items():
        doc_val = doc.get(key)
        if isinstance(val, dict):
            for op, operand in val.items():
                if op == "$in" and doc_val not in operand:
                    return False
                elif op == "$nin" and doc_val in operand:
                    return False
                elif op == "$lt":
                    if doc_val is None or doc_val >= operand:
                        return False
                elif op == "$gt":
                    if doc_val is None or doc_val <= operand:
                        return False
                elif op == "$ne" and doc_val == operand:
                    return False
        else:
            if doc_val != val:
                return False
    return True


def _build_tinydb_query(query: dict):
    """Build a TinyDB Query object from a simple dict query."""
    from tinydb import Query as Q
    q = Q()
    conditions = []
    for key, val in query.items():
        if isinstance(val, dict):
            for op, operand in val.items():
                if op == "$in":
                    conditions.append(q[key].test(lambda v, ops=operand: v in ops))
                elif op == "$nin":
                    conditions.append(q[key].test(lambda v, ops=operand: v not in ops))
        else:
            conditions.append(q[key] == val)

    if not conditions:
        return q["_id"].exists()
    result = conditions[0]
    for c in conditions[1:]:
        result = result & c
    return result


class FakeDB:
    """Mimics the Motor database object with synchronous TinyDB under the hood."""

    def __getattr__(self, name: str) -> Collection:
        return Collection(_get_db().table(name))

    def command(self, cmd: str):
        return {"ok": 1}


_fake_db = FakeDB()


async def connect_db():
    _get_db()  # Initialize
    print("TinyDB initialized — data stored in backend/data/db.json")


async def close_db():
    global _db
    if _db:
        _db.close()
        _db = None


def get_db() -> FakeDB:
    return _fake_db
