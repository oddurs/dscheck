# The brand asset generator is the terminal itself.
# vhs wordmark.tape  → social.png (+ wordmark.gif)
Output wordmark.gif
Set FontSize 34
Set Width 1200
Set Height 630
Set Padding 80
Set Theme { "background": "#f7f8fa", "foreground": "#232733", "green": "#2e7d4f", "red": "#b3392b", "yellow": "#a87a24", "black": "#232733", "cursor": "#f7f8fa" }
Hide
Type `clear && printf '\n\n\n  \033[1mdscheck\033[0m\n\n  \033[2mthe linter that knows your design system\033[0m\n\n\n  \033[32m✔\033[0m on-system: no findings\n' && tput civis && sleep 30`
Enter
Show
Sleep 2s
Screenshot social.png
Sleep 500ms
