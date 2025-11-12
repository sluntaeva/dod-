import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes

# Replace with your actual Bot Token
BOT_TOKEN = "8394269495:AAGph6h2PMujf3m7fSrZf72erBzxlut-_Uw"
# Replace with the short name of the game you registered with @BotFather
GAME_SHORT_NAME = "jelly_jumper"

# Enable logging
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO
)
logger = logging.getLogger(__name__)

# --- Handlers ---

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Sends a message with an inline button to start the game."""
    user = update.effective_user
    logger.info("User %s started the bot.", user.first_name)

    keyboard = [
        [InlineKeyboardButton("Play My Awesome Game!", callback_data="play_game")],
        [InlineKeyboardButton("High Scores", callback_data="show_scores")],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await update.message.reply_text(
        f"Hello {user.first_name}! Press the button to play the game.",
        reply_markup=reply_markup,
    )

async def play_game(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Sends the game message when the 'Play' button is pressed."""
    query = update.callback_query
    await query.answer()

    # The key part: sending the game
    await context.bot.send_game(
        chat_id=query.message.chat_id,
        game_short_name=GAME_SHORT_NAME,
    )

async def set_score(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handles the score update request from the game."""
    query = update.callback_query
    await query.answer()

    # The score is passed in the callback_data from the game's shareScore function
    # The format is assumed to be "score:1234"
    try:
        score = int(query.data.split(":")[1])
    except (IndexError, ValueError):
        logger.error("Invalid score format in callback data: %s", query.data)
        return

    user_id = query.from_user.id
    chat_id = query.message.chat_id
    message_id = query.message.message_id

    try:
        # Set the game score
        await context.bot.set_game_score(
            user_id=user_id,
            score=score,
            chat_id=chat_id,
            message_id=message_id,
            force=True, # Set to True to allow score to be set even if it's lower than current
        )
        await query.edit_message_text(f"Score updated for {query.from_user.first_name}: {score}")
    except Exception as e:
        logger.error("Failed to set game score: %s", e)
        await query.edit_message_text("Failed to update score. See logs for details.")

async def show_scores(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Retrieves and displays the high scores for the game."""
    query = update.callback_query
    await query.answer()

    chat_id = query.message.chat_id
    message_id = query.message.message_id

    try:
        # Get the high scores
        high_scores = await context.bot.get_game_high_scores(
            user_id=query.from_user.id, # The user_id is only used to identify the game message
            chat_id=chat_id,
            message_id=message_id,
        )

        score_list = "🏆 **High Scores** 🏆\n\n"
        for i, entry in enumerate(high_scores):
            score_list += f"{i+1}. {entry.user.first_name}: {entry.score}\n"

        await query.edit_message_text(score_list, parse_mode="Markdown")

    except Exception as e:
        logger.error("Failed to get high scores: %s", e)
        await query.edit_message_text("Failed to retrieve high scores. See logs for details.")


def main() -> None:
    """Start the bot."""
    # Create the Application and pass it your bot's token.
    application = Application.builder().token(BOT_TOKEN).build()

    # on different commands - answer in Telegram
    application.add_handler(CommandHandler("start", start))

    # on callback queries (from inline buttons)
    application.add_handler(CallbackQueryHandler(play_game, pattern="^play_game$"))
    application.add_handler(CallbackQueryHandler(show_scores, pattern="^show_scores$"))
    # A simple pattern to catch score submissions, which will have the score in the data
    application.add_handler(CallbackQueryHandler(set_score, pattern="^score:\d+$"))

    # Run the bot until the user presses Ctrl-C
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()
