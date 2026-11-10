eval "$(direnv hook zsh)"
eval "$(fnm env --use-on-cd)"



# Pi
export PATH="/Users/apple/.local/share/fnm/node-versions/v22.22.3/installation/bin:$PATH"

# Hermes Agent — ensure ~/.local/bin is on PATH
export PATH="$HOME/.local/bin:$PATH"

# CLAUDEX PATH
export PATH="/Users/apple/.claudex/bin:$PATH"

# CLAUDEX ALIAS
alias claudex="/Users/apple/.claudex/bin/claudex"

# Machine-local secrets (untracked)
[ -f "$HOME/.zshrc.local" ] && source "$HOME/.zshrc.local"
