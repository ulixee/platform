pkgutil --check-signature ./dist/mac/Ulixee.app
spctl -a -t exec -vvv ./dist/mac/Ulixee.app
