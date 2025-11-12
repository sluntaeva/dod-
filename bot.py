import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes

# Replace with your actual Bot Token
BOT_TOKEN = "8394269495:AAGph6h2PMujf3m7fSrZf72erBzxlut-_Uw"
# Replace with the short name of the game you registered with @BotFather
GAME_SHORT_NAME = "jellygame"

logging.basicConfig(level=logging.INFO)

# --- Команда /start ---
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = [
        [InlineKeyboardButton("🎮 Открыть игру", web_app=WebAppInfo(url="https://sluntaeva.github.io/dod-/"))]
    ]

    await update.message.reply_text(
        "Добро пожаловать! Нажми кнопку, чтобы запустить игру 👇",
        reply_markup=InlineKeyboardMarkup(keyboard)
    )

# --- Основная функция ---
def main():
    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.run_polling()

if __name__ == "__main__":
    main()