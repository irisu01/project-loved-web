import { Dispatch, RefObject, MouseEvent, KeyboardEvent, SetStateAction, useState, FormEvent } from "react";
import { Form, FormSubmitHandler, Icon } from "src/dom-helpers";
import WysiwygEditorButton from "./WysiwygEditorButton";

interface WysiwygEditorProps {
  editorName: string,
  text: string | undefined,
  refObject: RefObject<HTMLTextAreaElement>,
  setEditing: Dispatch<SetStateAction<boolean>>
  onSubmit: FormSubmitHandler
}

export default function WysiwygEditor({
  editorName,
  text,
  refObject,
  setEditing,
  onSubmit
}: WysiwygEditorProps) {
  const [busy, setBusy] = useState(false);
  const editHistory: string[] = [
    text || ""
  ];

  const onEditorButtonClick = (event: MouseEvent<HTMLButtonElement, globalThis.MouseEvent>) => {
    if (refObject.current == null) {
      return;
    }

    const valueTable = {
      bold: "[b]$[/b]",
    }

    const cursorPosition = refObject.current.selectionStart;
    const endCursorPosition = refObject.current.selectionEnd;

    if (valueTable.hasOwnProperty(event.currentTarget.value)) {
      const value = valueTable[event.currentTarget.value as keyof typeof valueTable];
      const [leftHand, rightHand] = value.split("$");
      if (event.currentTarget.value == 'bold') {
        const text = refObject.current.value;
        let endText;
        if (cursorPosition == endCursorPosition) {
          endText = text.slice(0, cursorPosition) + leftHand + text.slice(cursorPosition) + rightHand;
          refObject.current.setSelectionRange(cursorPosition + 3, cursorPosition + 3);
        } else {
          endText = text.slice(0, cursorPosition) + leftHand + text.slice(cursorPosition, endCursorPosition) + rightHand + text.slice(endCursorPosition);
          refObject.current.setSelectionRange(cursorPosition + 3, endCursorPosition + 3);
        }
        refObject.current.focus();
        refObject.current.value = endText;
      }
    } else {

    }
  };

  const onTextChange = (event: FormEvent<HTMLTextAreaElement>) => {
    if (refObject.current == null) {
      return;
    }

    if (editHistory.length > 10) {
      editHistory.shift();
    }

    editHistory.push(refObject.current.value);

    // amend display
    console.log(refObject.current.innerText);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (refObject.current == null) {
      return;
    }

    if (event.ctrlKey == true && event.key == 'z') {
      event.preventDefault();
      if (editHistory.length > 1) {
        refObject.current.value = editHistory[editHistory.length - 2];
        editHistory.pop();
        refObject.current.focus();
      }
    }
  }

  return <Form busyState={[busy, setBusy]} onSubmit={onSubmit}>
    <div className='textarea-wrapper'>
      <div className='editor-style-buttons'>
        <WysiwygEditorButton
          buttonValue='bold'
          buttonIcon={<Icon
            name="wysiwyg/bold"
          />}
          onClick={onEditorButtonClick}
        />
      </div>
      <textarea
        name={editorName}
        defaultValue={text}
        ref={refObject}
        onInput={onTextChange}
        onKeyDown={onKeyDown}
      />
      <div className='editor-buttons'>
        <span>Use BBCode for formatting</span>
        <button type='submit'>{busy ? 'Updating...' : 'Update'}</button>
        <button type='button' onClick={() => setEditing(false)}>
          Cancel
        </button>
      </div>
    </div>
  </Form>
}