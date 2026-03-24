from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

client: AsyncIOMotorClient = None
db = None


async def connect_db():
    global client, db
    client = AsyncIOMotorClient(settings.mongodb_uri)
    db = client[settings.database_name]
    await db.command("ping")
    print(f"Connected to MongoDB: {settings.database_name}")


async def close_db():
    global client
    if client:
        client.close()


def get_db():
    return db
