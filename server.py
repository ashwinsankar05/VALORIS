"""
VALORIS Launcher
Runs the production modular backend located in backend/server.py
"""
import os
import sys

if __name__ == "__main__":
    backend_script = os.path.join(os.path.dirname(__file__), "backend", "server.py")
    with open(backend_script, "r", encoding="utf-8") as f:
        code = compile(f.read(), backend_script, 'exec')
        exec(code, {'__name__': '__main__', '__file__': backend_script})
