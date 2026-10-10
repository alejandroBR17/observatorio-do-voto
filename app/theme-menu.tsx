'use client';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { Sun, Moon, Monitor, Check, ChevronDown } from 'lucide-react';
export type Theme = 'system' | 'light' | 'dark';
const options = [
  { value: 'light', label: 'Claro', Icon: Sun },
  { value: 'dark', label: 'Escuro', Icon: Moon },
  { value: 'system', label: 'Usar sistema', Icon: Monitor },
] as const;
export function ThemeMenu({ value, onChange }: { value: Theme; onChange: (theme: Theme) => void }) {
  const current = options.find((o) => o.value === value)!;
  return (
    <Menu.Root>
      <Menu.Trigger className="theme-button" aria-label={'Tema: ' + current.label}>
        <current.Icon size={17} />
        <span>Tema</span>
        <ChevronDown size={13} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content className="theme-menu" sideOffset={8} align="end" collisionPadding={12}>
          <Menu.Label className="theme-menu-label">APARÊNCIA</Menu.Label>
          <Menu.RadioGroup value={value} onValueChange={(v) => onChange(v as Theme)}>
            {options.map(({ value, label, Icon }) => (
              <Menu.RadioItem className="theme-item" key={value} value={value}>
                <Icon size={18} />
                <span>
                  {label}
                  {value === 'system' && <small>Acompanha seu dispositivo</small>}
                </span>
                <Menu.ItemIndicator>
                  <Check size={16} />
                </Menu.ItemIndicator>
              </Menu.RadioItem>
            ))}
          </Menu.RadioGroup>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
