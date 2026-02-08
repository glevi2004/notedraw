import { Highlight, themes } from 'prism-react-renderer';

interface CodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
  addedLines?: number[];
  removedLines?: number[];
}

export default function CodeBlock({ 
  code, 
  language = 'python',
  showLineNumbers = true,
  highlightLines = [],
  addedLines = [],
  removedLines = []
}: CodeBlockProps) {
  return (
    <Highlight theme={themes.vsDark} code={code.trim()} language={language}>
      {({ className, style, tokens, getLineProps, getTokenProps }) => (
        <pre 
          className={`${className} code-editor overflow-auto`} 
          style={{ 
            ...style, 
            background: 'transparent',
            margin: 0,
            padding: '12px 0',
            fontSize: '12px',
            lineHeight: '1.6'
          }}
        >
          {tokens.map((line, i) => {
            const isAdded = addedLines.includes(i);
            const isRemoved = removedLines.includes(i);
            const isHighlighted = highlightLines.includes(i);
            
            return (
              <div 
                key={i} 
                {...getLineProps({ line })} 
                className={`
                  flex
                  ${isAdded ? 'bg-green-500/15' : ''}
                  ${isRemoved ? 'bg-red-500/15' : ''}
                  ${isHighlighted ? 'bg-blue-500/10' : ''}
                  ${isAdded || isRemoved ? 'border-l-2' : ''}
                  ${isAdded ? 'border-l-green-500' : ''}
                  ${isRemoved ? 'border-l-red-500' : ''}
                `}
                style={{ paddingLeft: showLineNumbers ? '8px' : '16px' }}
              >
                {showLineNumbers && (
                  <span className="select-none text-muted-foreground/50 w-8 text-right mr-4 text-xs">
                    {i + 1}
                  </span>
                )}
                <span className="flex-1">
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </span>
              </div>
            );
          })}
        </pre>
      )}
    </Highlight>
  );
}
