#!/bin/bash

JSMIN="/lms/build/jsmin"
SRCDIR="/lms/src/js"
BUNDLE="/lms/src/js/bundle.js"
BUILD_DIR="/lms/build"



# We don't need to re-min these often, but when we do...

# $JSMIN < $SRCDIR/vendor/mithril/mithril-1.1.6.js > $SRCDIR/vendor/mithril/mithril.min.js
# $JSMIN < $SRCDIR/vendor/mithril/stream.js > $SRCDIR/vendor/mithril/stream.min.js
# $JSMIN < $SRCDIR/vendor/moment/moment.js > $SRCDIR/vendor/moment/moment.min.js
# $JSMIN < $SRCDIR/vendor/ramda/ramda.js > $SRCDIR/vendor/ramda/ramda.min.js
# $JSMIN < $SRCDIR/vendor/sortable/sortable.js > $SRCDIR/vendor/sortable/sortable.min.js


# minify and concat our source - order matters!

pushd $SRCDIR
cat \
	vendor/mithril/mithril.min.js \
	vendor/mithril/stream.min.js \
	vendor/moment/moment.min.js \
	vendor/ramda/ramda.min.js \
	vendor/sortable/sortable.min.js \
	> $BUNDLE
cat $BUILD_DIR/license_header.txt >> $BUNDLE
cat \
	st.js \
	utils.js \
	tags.js \
	uploader.js \
	player.js \
	scorm.js \
	erules.js \
	records.js \
	login.js \
	home.js \
	people.js \
	content.js \
	catalog.js \
	lpath.js \
	session.js \
	cb.js \
	discussion.js \
	config.js \
	main.js \
	route.js \
	| $JSMIN >> $BUNDLE
popd
