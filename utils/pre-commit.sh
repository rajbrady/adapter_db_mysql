#!/bin/sh

# exit on any failure in the pipeline
set -e

# -------------------------------------------------
# pre-commit
# -------------------------------------------------
# Contains the standard set of tasks to run before
# committing changes to the repo. If any tasks fail
# then the commit will be aborted.
# -------------------------------------------------

printf "%b" "Running pre-commit hooks...\\n"

# validate the package.json file
node utils/validate.js

# lint the code
npm run lint

# run the unit tests
npm run test:unit

# do not do the following steps on the master branch
BRANCH=`git branch | grep \* | cut -d ' ' -f2`
IFS="/"
TYPE=($BRANCH)
echo "Branch: $BRANCH"
if [ $BRANCH == "master" ]; then
	echo "Branch master, skipping version updates..."
else
	echo "Updating package.json version based on branch name"
	if [ "${TYPE[0]}" = "patch" ]; then
		echo "Updating patch version..."
		npm --no-git-tag-version version patch
	elif [ "${TYPE[0]}" = "minor" ]; then
		echo "Updating minor version..."
		npm --no-git-tag-version version minor
	elif [ "${TYPE[0]}" = "major" ]; then
		echo "Updating major version..."
		npm --no-git-tag-version version major
	else
		echo "Can not determine branch type! Updating patch version..."
		npm --no-git-tag-version version patch
	fi

	# bundle dependencies
	npm run bundle

	# add any changes to package.json
	git add package.json package-lock.json

	# generate pronghorn.json from jsdocs & add any changes
	npm run generate

	# npm run postman
	git add pronghorn.json
	git add postman.json
fi

printf "%b" "Finished running pre-commit hooks\\n"
