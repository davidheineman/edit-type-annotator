function displayAnnotator(data) {
    let pgNum = 1;
    generateView(data[pgNum]);
}

function generateView(sent) {
    $(".input-sent").html(sent.Original);
    createGroup(sent.Splittings, "#par-list");
}

function isWithin(e, parent) {
    return e.clientX > $(parent).offset().left && e.clientX < $(parent).offset().left + $(parent).width() && e.clientY > $(parent).offset().top && e.clientY < $(parent).offset().top + $(parent).height();
}

function getCaretCharacterOffsetWithin(element) {
    var caretOffset = 0;
    var doc = element.ownerDocument || element.document;
    var win = doc.defaultView || doc.parentWindow;
    var sel;
    if (typeof win.getSelection != "undefined") {
        sel = win.getSelection();
        if (sel.rangeCount > 0) {
            var range = win.getSelection().getRangeAt(0);
            var preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(element);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            caretOffset = preCaretRange.toString().length;
        }
    } else if ( (sel = doc.selection) && sel.type != "Control") {
        var textRange = sel.createRange();
        var preCaretTextRange = doc.body.createTextRange();
        preCaretTextRange.moveToElementText(element);
        preCaretTextRange.setEndPoint("EndToEnd", textRange);
        caretOffset = preCaretTextRange.text.length;
    }
    return caretOffset;
}

// Moving paraphrases
$(document).on("mousedown", '.par', function (e) {
    var parent = $(e.target).parent()[0];
    e.preventDefault();
    var curr = e.target;

    // Recreate the span
    var el = document.createElement("span");
    el.className = "par";

    // See where the mouse is moving
    $(document).on("mousemove", function(e) {
        var x = e.clientX, y = e.clientY;

        range = document.caretRangeFromPoint(x, y);

        var all =  $(curr)[0].innerText;
        var text1len = 0;
        // Prepend span
        if ($(curr)[0].previousSibling != null && $(curr)[0].previousSibling.wholeText != null) {
            all = $(curr)[0].previousSibling.wholeText + all;
            text1len = $(curr)[0].previousSibling.length;
        }
        // Postpend span
        if ($(curr)[0].nextSibling != null) {
            all = all + $(curr)[0].nextSibling.wholeText;
        }

        var spanlen = $(curr)[0].innerText.length;
        var start_idx, end_idx;

        // Default values if we're in other spans
        start_idx = text1len;
        end_idx = text1len + spanlen;

        // If we're moving outside the sentence
        if ($(range.commonAncestorContainer.parentElement).is(parent)) {
            // If we're moving to the left
            if ($(range.commonAncestorContainer.nextSibling).is(curr)) {
                start_idx = range.startOffset;
                end_idx = text1len + spanlen;
            } 
            // If we're moving to the right
            else if ($(range.commonAncestorContainer.previousSibling).is(curr)) {
                start_idx = text1len;
                end_idx = text1len + spanlen + range.startOffset;
            }
        } 
        // If we're moving within the sentence
        else if ($(range.commonAncestorContainer.parentElement).is(curr)) {
            if (range.startOffset > range.commonAncestorContainer.wholeText.length / 2) {
                // inner right
                start_idx = text1len;
                end_idx = text1len + range.startOffset;
            } else {
                // inner left
                start_idx = text1len + range.startOffset;
                end_idx = text1len + spanlen;
            }
        }

        // console.log(all.substring(0, start_idx));
        // console.log(all.substring(start_idx, end_idx));
        // console.log(all.substring(end_idx));

        // Create a new text element if it didn't exist before
        if (!$(curr)[0].previousSibling) {
            var t = document.createTextNode(all.substring(0, start_idx));
            $(t).insertBefore($(curr)[0]); 
        } else if ($(curr)[0].previousSibling.nodeName == 'SPAN') {
            if (start_idx != text1len) {
                var t = document.createTextNode(all.substring(0, start_idx));
                $(t).insertBefore($(curr)[0]);
            }
        } else {
            $(curr)[0].previousSibling.textContent = all.substring(0, start_idx);
        }

        // Create a new text element if it didn't exist after
        if (!$(curr)[0].nextSibling){
            // If there is no next sibling, we need to create one
            var t = document.createTextNode(all.substring(end_idx));
            $(t).insertAfter($(curr)[0]);
        } else if ($(curr)[0].nextSibling.nodeName == 'SPAN') {
            if (end_idx != text1len + spanlen) {
                var t = document.createTextNode(all.substring(end_idx));
                $(t).insertAfter($(curr)[0]);
            }
        } else {
            $(curr)[0].nextSibling.textContent = all.substring(end_idx);
        }
        $(curr)[0].innerText = all.substring(start_idx, end_idx);
    })

    $(document).on("mouseup", function () {
        $(document).off("mousemove");
    });
})

$(document).on("mousedown", '.del, .spt', function (curr) {
    // Recreate the span
    var el = document.createElement("span");
    el.className = $(curr.target).attr("class");

    // Save the location of the original sentence the span was saved in
    var parent = $(curr.target).parent()[0];
    var orig = curr;
    var orig_target = curr.target;

    curr.preventDefault();
    
    $(document).on("mousemove", function (curr) {
        var range, textRange, x = curr.clientX, y = curr.clientY;

        // Delete the old span
        $(curr).remove();
        $($(orig.target)).addClass("hidden-edit");
        
        // Try the standards-based way first
        if (document.caretPositionFromPoint) {
            var pos = document.caretPositionFromPoint(x, y);
            range = document.createRange();
            range.setStart(pos.offsetNode, pos.offset);
            range.collapse();
        }
        // Next, the WebKit way
        else if (document.caretRangeFromPoint) {
            range = document.caretRangeFromPoint(x, y);
        }
        // Finally, the IE way
        else if (document.body.createTextRange) {
            textRange = document.body.createTextRange();
            textRange.moveToPoint(x, y);
            var spanId = "temp_" + ("" + Math.random()).slice(2);
            textRange.pasteHTML('<span id="' + spanId + '">&nbsp;</span>');
            var span = document.getElementById(spanId);
            //place the new pin
            span.parentNode.replaceChild(el, span);
        }

        // Place the new span
        if (range) {
            range.insertNode(el);
        }

        // Fix broken text spans
        el.previousSibling.parentNode.normalize();

        // Check if the new span is inside the paragraph
        var parent_new = $(el).parent()[0];
        if (!$(parent).is(parent_new)) {
            $(el).remove();
        }
    });

    // Remove the handler when the user has stopped dragging
    $(document).on("mouseup", function () {
        $(document).off("mousemove");

        // Check if the new span is inside the paragraph, if not, restore the original span
        var parent_new = $(el).parent()[0];
        if (!$(parent).is(parent_new)) {
            // Restore the original span
            $(orig_target).removeClass("hidden-edit");
            $(el).remove();
        } else {
            // Remove the original span
            $(orig_target).remove();

            // for each hidden edit, remove and normalize the parent
            $(".hidden-edit").each(function (i, elm) {
                var temp = elm.parentNode;
                $(elm).remove();
                temp.normalize();
            });
        }        
        parent.normalize();
    });
});

function createGroup(df, container_id) {
    for (let i = 0; i < df.length; i++) {
        // Write sentence
        let s = df[i][0];           // sentence
        let contr = "<p>";          // DOM container for sent
        
        // Write beginning of sentence
        contr = contr.concat(s.substring(0, df[i][1][1]));

        // Show edits
        for (let j = 1; j < df[i].length; j++) {
            let edit = df[i][j];

            // Add the non-annotated part of the sentence
            if (j > 1) {
                contr = contr.concat(s.substring(df[i][j - 1][2], edit[1]));
            }

            // Add spans for types of edits
            let edit_span = "<span";
            if (edit[0] == 0) {
                edit_span = edit_span.concat(' class="del">');
            } else if (edit[0] == 1) {
                edit_span = edit_span.concat(' class="par">');
            } else if (edit[0] == 2) {
                edit_span = edit_span.concat(' class="spt">');
            }
            edit_span = edit_span.concat(s.substring(edit[1], edit[2]));
            edit_span = edit_span.concat('</span>');

            contr = contr.concat(edit_span);
        }

        // Write end of sentence
        contr = contr.concat(s.substring(df[i].at(-1)[2]));

        contr = contr.concat("</p>");

        // Create col container for sentence
        let box = '<input min="0" max="100" class="form-control" aria-label="Score"><div class="invalid-feedback">Please enter a value 0-100</div>'
        let div = "<div class='row'><div class='col-2'>" + box + "</div><div class='col-10'>" + contr + "</div></div>";
        let li = $("<li class='list-group-item'></li>").append($(div));

        $(container_id).append(li);

        disableFormControl();
    }
    // $(container_id).sortable().disableSelection();  
}

// For web demo, draw data from JSON file
$.ajax({
    url: 'data/input.json',
    dataType: 'json',
}).done(displayAnnotator);