import { MouseEventHandler } from "react"

interface WysiwygEditorButtonProps {
    buttonValue: string,
    buttonIcon: JSX.Element,
    onClick: MouseEventHandler<HTMLButtonElement>
}

export default function WysiwygEditorButton({
    buttonValue,
    buttonIcon,
    onClick
}: WysiwygEditorButtonProps) {
    return <button
        value={buttonValue}
        type="button"
        onClick={(event) => onClick(event)}
    >
        {buttonIcon}
    </button>
}