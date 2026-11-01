'use client';
import {useEffect,useState} from 'react';
import {Input} from '@/components/ui/input';
import {
  SUGGESTION_DEBOUNCE_MS,SUGGESTION_LIMIT,buildSuggestions,
  type EmployeeSuggestion,type SuggestionSource,
} from '@/lib/employee-suggest';

// One typeahead implementation for every employee picker: the transactions
// search, the Add Transaction drawer and the Cash portal search. Callers own the
// committed value; this component owns debounce, open state, keyboard navigation
// and the ARIA combobox/listbox wiring.
export type EmployeeTypeaheadProps={
  id:string;
  value:string;
  candidates:readonly SuggestionSource[];
  onValueChange:(value:string)=>void;
  onSelect:(suggestion:EmployeeSuggestion)=>void;
  placeholder?:string;
  autoComplete?:string;
  required?:boolean;
  disabled?:boolean;
  maxLength?:number;
  className?:string;
  listLabel?:string;
  // True when the caller has already committed an employee, so the dropdown must
  // not reopen on the "Name · phone" display text.
  suppressSuggestions?:boolean;
};

export function EmployeeTypeahead({
  id,value,candidates,onValueChange,onSelect,
  placeholder,autoComplete='off',required,disabled,maxLength,className,listLabel='Employee suggestions',suppressSuggestions,
}:EmployeeTypeaheadProps){
  const [debounced,setDebounced]=useState('');
  const [open,setOpen]=useState(false);
  const [active,setActive]=useState(-1);

  useEffect(()=>{
    const timer=setTimeout(()=>setDebounced(value),SUGGESTION_DEBOUNCE_MS);
    return ()=>clearTimeout(timer);
  },[value]);

  const suggestions=suppressSuggestions?[]:buildSuggestions(candidates,debounced,SUGGESTION_LIMIT);
  const showSuggestions=open&&suggestions.length>0;
  const listId=`${id}-suggestions`;
  const optionId=(index:number)=>`${id}-option-${index}`;

  const close=()=>{setOpen(false);setActive(-1);};

  const choose=(suggestion:EmployeeSuggestion)=>{
    onSelect(suggestion);
    close();
  };

  const change=(next:string)=>{
    onValueChange(next);
    setActive(-1);
    setOpen(next.trim().length>0);
  };

  const onKeyDown=(event:React.KeyboardEvent<HTMLInputElement>)=>{
    if(event.key==='Escape'){close();return;}
    if(!showSuggestions)return;
    if(event.key==='ArrowDown'){event.preventDefault();setActive(i=>Math.min(i+1,suggestions.length-1));return;}
    if(event.key==='ArrowUp'){event.preventDefault();setActive(i=>Math.max(i-1,0));return;}
    if(event.key==='Enter'&&active>=0&&suggestions[active]){event.preventDefault();choose(suggestions[active]);}
  };

  return (
    <div className="relative">
      <Input
        id={id}
        type="search"
        role="combobox"
        aria-expanded={showSuggestions}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showSuggestions&&active>=0?optionId(active):undefined}
        autoComplete={autoComplete}
        className={className}
        required={required}
        disabled={disabled}
        maxLength={maxLength}
        value={value}
        placeholder={placeholder}
        onChange={event=>change(event.target.value)}
        onKeyDown={onKeyDown}
        onFocus={()=>{if(!suppressSuggestions&&value.trim().length>0)setOpen(true);}}
        onBlur={close}
      />
      {showSuggestions&&(
        <ul
          id={listId}
          role="listbox"
          aria-label={listLabel}
          className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
          onMouseDown={event=>event.preventDefault()}
        >
          {suggestions.map((suggestion,index)=>(
            <li
              key={suggestion.phone}
              id={optionId(index)}
              role="option"
              aria-selected={index===active}
              className={`cursor-pointer rounded-sm px-2 py-1.5 text-sm ${index===active?'bg-accent text-accent-foreground':''}`}
              onMouseEnter={()=>setActive(index)}
              onClick={()=>choose(suggestion)}
            >
              {suggestion.display}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
