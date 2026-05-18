import React from 'react'

interface ThemedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const ThemedInput: React.FC<ThemedInputProps> = ({ className, ...props }) => {
  return (
    <input
      className={`form-input ui-input-box ${className ?? ''}`.trim()}
      {...props}
    />
  )
}
