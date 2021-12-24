## Sentence Ranking Annotator
Work-in-progress annotator for upcoming paper. `index.html` can be used both as a standalone annotator or dropped directly into mTurk for annotation.

**View the [tutorial](https://davidheineman.github.io/edit-type-annotator/tutorial), or see a [demo of the interface](https://davidheineman.github.io/edit-type-annotator/?s=0).**

### How to use
In `script.js`, it calls the content in `data/input.json` for the annotator to use based on either the url (the `?s=n` suffix) or directly from mTurk. If you use mTurk, just make sure to update the `input.json` and upload an excel files of the sentence ids you want annotated.

**NEW**: `Script.js` now supports specifying the input file. It will use `data/draft_input.json` as it's default, but just pass a string argument to the `startupInterface()` function at the bottom of `index.html` to use a different file. Should look like: `startupInterface(is_mturk=true, data_path='data/path-to-data.json')`

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
