import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes

# Replace with your actual Bot Token
BOT_TOKEN = "8394269495:AAGph6h2PMujf3m7fSrZf72erBzxlut-_Uw"
# Replace with the short name of the game you registered with @BotFather
GAME_SHORT_NAME = "jellygame"

logging.basicConfig(level=logging.INFO)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = [[InlineKeyboardButton("🎮 Играть в игру", callback_data="play_game")]]
    await update.message.reply_text("Нажми кнопку, чтобы начать игру:", reply_markup=InlineKeyboardMarkup(keyboard))

async def play_game(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    await context.bot.send_game(chat_id=query.message.chat.id, game_short_name=GAME_SHORT_NAME)

def main():
    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CallbackQueryHandler(play_game, pattern="^play_game$"))
    app.run_polling()

if __name__ == "__main__":
    main()