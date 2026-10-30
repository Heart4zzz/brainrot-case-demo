import json
import logging
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
API_BASE = "https://api.telegram.org/bot{}"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)


def load_env_file():
    env_path = BASE_DIR / ".env"
    if not env_path.exists():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            os.environ.setdefault(key, value)


load_env_file()
BOT_TOKEN = os.getenv("BOT_TOKEN", "").strip()
WEB_APP_URL = os.getenv("WEB_APP_URL", "https://example.com").strip()
NEWS_URL = os.getenv("NEWS_URL", "https://t.me/").strip()
SUPPORT_URL = os.getenv("SUPPORT_URL", "https://t.me/").strip()

WELCOME_TEXT = (
    "👋 Приветствуем на демо-проекте Brainrot Case!\n\n"
    "😉 Добро пожаловать на ночной рынок брейнротов — здесь можно открыть кейс, улучшить находку и собрать коллекцию.\n\n"
    "- 🎰 Открывай кейсы\n"
    "- ♻️ Улучшай своих брейнротов\n"
    "- 🎒 Собирай коллекцию\n\n"
    "🍀 Удачи! Это демонстрационная версия: только тестовые монеты и предметы."
)


def api_call(method, payload=None):
    if not BOT_TOKEN:
        raise RuntimeError("Не задан BOT_TOKEN в файле .env")

    url = API_BASE.format(BOT_TOKEN) + "/" + method
    body = json.dumps(payload or {}, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=40) as response:
        result = json.loads(response.read().decode("utf-8"))

    if not result.get("ok"):
        raise RuntimeError(result.get("description", "Telegram API error"))
    return result.get("result")


def start_keyboard():
    return {
        "inline_keyboard": [
            [
                {
                    "text": "🎮 Играть сейчас!",
                    "web_app": {"url": WEB_APP_URL},
                }
            ],
            [
                {"text": "📢 Новостной канал", "url": NEWS_URL},
                {"text": "🛟 Поддержка", "url": SUPPORT_URL},
            ],
        ]
    }


def send_start(chat_id):
    api_call(
        "sendMessage",
        {
            "chat_id": chat_id,
            "text": WELCOME_TEXT,
            "reply_markup": start_keyboard(),
            "disable_web_page_preview": True,
        },
    )


def configure_menu_button():
    api_call(
        "setChatMenuButton",
        {
            "menu_button": {
                "type": "web_app",
                "text": "Играть",
                "web_app": {"url": WEB_APP_URL},
            }
        },
    )


def main():
    if not BOT_TOKEN:
        raise RuntimeError("Не задан BOT_TOKEN. Открой .env и вставь токен от @BotFather.")
    if not WEB_APP_URL.startswith("https://") or "example.com" in WEB_APP_URL:
        logging.warning("WEB_APP_URL не настроен: укажи HTTPS-ссылку GitHub Pages в .env")

    try:
        configure_menu_button()
        logging.info("Кнопка Mini App добавлена в меню бота")
    except Exception as error:
        logging.warning("Не удалось настроить кнопку меню: %s", error)

    try:
        api_call("deleteWebhook", {"drop_pending_updates": False})
    except Exception as error:
        logging.warning("Не удалось отключить webhook: %s", error)

    offset = None
    logging.info("Brainrot Case demo bot is running. Stop with Ctrl+C.")

    while True:
        try:
            payload = {"timeout": 25, "allowed_updates": ["message"]}
            if offset is not None:
                payload["offset"] = offset
            updates = api_call("getUpdates", payload) or []

            for update in updates:
                offset = update["update_id"] + 1
                message = update.get("message") or {}
                chat = message.get("chat") or {}
                text = (message.get("text") or "").strip()
                chat_id = chat.get("id")

                if not chat_id or not text:
                    continue

                command = text.split(maxsplit=1)[0].split("@", 1)[0].lower()
                if command == "/start":
                    send_start(chat_id)
                else:
                    api_call(
                        "sendMessage",
                        {
                            "chat_id": chat_id,
                            "text": "Нажми /start, чтобы открыть меню Brainrot Case.",
                        },
                    )

        except KeyboardInterrupt:
            logging.info("Bot stopped")
            break
        except (urllib.error.URLError, TimeoutError, OSError, RuntimeError, ValueError) as error:
            logging.error("Ошибка соединения с Telegram: %s", error)
            time.sleep(4)


if __name__ == "__main__":
    main()
