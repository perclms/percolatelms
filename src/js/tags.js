// Percolate LMS
//
// Copyright (C) 2018 Michaels & Associates Docntrain, Ltd.
//
// This program is free software: you can redistribute it and/or modify it under
// the terms of the GNU General Public License as published by the Free Software
// Foundation, either version 3 of the License, or (at your option) any later
// version.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of  MERCHANTABILITY or FITNESS
// FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License along with
// this program.  If not, see <http://www.gnu.org/licenses/>.
//



var Tags = function(item_list, options) {

	var isNothing = R.either(R.isNil, R.isEmpty);
	var taglist = extractTags(item_list);
	var selected_tags = [];
	var filtered_item_list = item_list;

	function isSelected(t) {
		return R.contains(t, selected_tags);
	}

	function isSystemTag(t) {
		return R.test(/^\$/, t);
	}

	function extractTags(list) {
		if (list == null) { return []; }
		var tagprop = R.map(R.prop('tags'));
		var taglist = R.map(R.split(','));
		var nonempty = R.reject(isNothing);
		return R.compose(R.uniq, R.unnest, taglist, nonempty, tagprop)(list);
	};


	function itemMatchesSelectedTags(item) {
		// no tags selected, so everything matches
		if (R.isEmpty(selected_tags)) return true;
		// contains no tags, so can't match selected tags
		if (isNothing(item.tags)) return false;
		// otherwise, all selected tags need to be in the item's tag string
		function itemHasTag(t) {
			return item.tags.indexOf(t) > -1;
		}
		return R.all(itemHasTag, selected_tags);
	}

	function toggleTag(t) {
		return function() {
			if (isSelected(t)) removeTagFilter(t);
			else addTagFilter(t);
			filter();
		}
	}

	function addTagFilter(t) {
		selected_tags.push(t);
	}

	function removeTagFilter(t) {
		selected_tags = R.reject(R.equals(t), selected_tags);
	}

	function filter() {
		filtered_item_list = R.filter(itemMatchesSelectedTags, item_list);
		// inform the parent interface that we have a new filtered list
		return filtered_item_list;
	}

	function click(t) {
		return function() {
			if (options.filter_on_click) {
				if (isSelected(t)) removeTagFilter(t);
				else addTagFilter(t);
				filter();
				options.on_filter(filter());
			}
			if (options.on_click) {
				options.on_click(t);
			}
		};
	}

	function viewThumb(t) {
		var sel = isSelected(t) ? '.selected' : '';
		var sys = isSystemTag(t) ? '.sys' : '.not-sys';
		return m("li" + sel + sys, {
			onclick: click(t)
		}, t);
	}

	function viewThumbList() {
		return R.isNil(taglist) ? null : m("ul.tags", R.map(viewThumb, taglist));
	}

	return {
		viewThumbList: viewThumbList,
		toggleTag: toggleTag,
		addTagFilter: addTagFilter,
		removeTagFilter: removeTagFilter,
		filter: filter,
	};
};
