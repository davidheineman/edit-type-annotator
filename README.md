### How to use
In `script.js`, it calls the content in `data/example.json` for the annotator to use based on either the url (the `?s=n` suffix) or directly from mTurk. If you use mTurk, just make sure to update the `data/example.json` and upload an excel files of the sentence ids you want annotated.

#### Options
See the last second to last line of `index.html` for options when using the interface:
```
  <script>modifyIterfaceOptions(enable_fix_spans=false, make_sortable=true, enable_sorting_between_categories=false)</script>
```
- `enable_fix_spans`: Enables span fixer.
- `make_sortable`: Allows moving the sentences within the same category.
- `enable_sorting_between_categories`: Allows moving sentences between categories.
- `enable_rating`: Enables rating sentences.


#### Format of `input.json`
It contains a list of sentences, each with an ID, the original sentence, and any given edits. This interface also optionally allows for categorizing sentences into types of edits.
```
[
  {
    "ID": sentence ID,
    "Original": original sentence,
    "Deletions": [[sentence 1, source 1, edit 1, edit 2, ...], [sentence 2, source 2, edit 1, edit 2, ...]],
    "Paraphrases": see above,
    "Splittings": see above,
  },
  {
    sentence 2
  }
]
```
Where each "edit" represents a split, paraphrase or deletion in this format:
```
edit 1 = [edit id (0 = deletion, 1 = paraphrase, 2 = split), start index of edit, end index of edit]
```
And the "source" is wherever the sentence came from (this is just copied to the output).

#### Output Format
The output is in the same json format as the input except for each sentence (instead of being in the format `[sentence i, source i, edit 1, edit 2, ..., edit n]`, it will be in the format `[score from 0-100, sentence i, source i, edit 1, edit 2, ..., edit n]`  and the array of edited sentences in the output will be in the order that the user re-ranked them).
