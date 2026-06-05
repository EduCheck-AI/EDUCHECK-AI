import httpx
import asyncio

async def test_ollama_simple():
    print("1️⃣ Test connexion de base...")
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get("http://localhost:11434/")
            print(f"Connexion: {r.status_code}")
    except Exception as e:
        print(f"Erreur connexion: {type(e).__name__} - {e}")
        return

    print("\n2️⃣ Test API tags...")
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get("http://localhost:11434/api/tags")
            print(f"✅ Tags: {r.status_code}")
            if r.status_code == 200:
                models = r.json().get("models", [])
                print(f"   Modèles: {[m['name'] for m in models]}")
    except Exception as e:
        print(f"❌ Erreur tags: {type(e).__name__} - {e}")

    print("\n3️⃣ Test API generate (sans image)...")
    try:
        payload = {
            "model": "llava:latest",
            "prompt": "Dis 'Hello' en français",
            "stream": False
        }
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post("http://localhost:11434/api/generate", json=payload)
            print(f"✅ Generate status: {r.status_code}")
            if r.status_code == 200:
                result = r.json()
                print(f"   Réponse: {result.get('response', '')[:100]}")
            else:
                print(f"❌ Réponse: {r.text[:200]}")
    except Exception as e:
        print(f"❌ Erreur generate: {type(e).__name__} - {e}")

    print("\n4️⃣ Test API chat (sans image)...")
    try:
        payload = {
            "model": "llava:latest",
            "messages": [{"role": "user", "content": "Dis 'Hello' en français"}],
            "stream": False
        }
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post("http://localhost:11434/api/chat", json=payload)
            print(f"✅ Chat status: {r.status_code}")
            if r.status_code == 200:
                result = r.json()
                print(f"   Réponse: {result.get('message', {}).get('content', '')[:100]}")
            else:
                print(f"❌ Réponse: {r.text[:200]}")
    except Exception as e:
        print(f"❌ Erreur chat: {type(e).__name__} - {e}")

if __name__ == "__main__":
    print("=" * 50)
    print("TEST OLLAMA SIMPLE")
    print("=" * 50)
    asyncio.run(test_ollama_simple())