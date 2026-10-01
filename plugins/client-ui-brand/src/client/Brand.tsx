import type { SidebarBrandMarkOwnerProps, SidebarBrandNameOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client';
import type * as ReactNamespace from 'react';
import type { ReactElement } from 'react';

export type ReactModule = typeof ReactNamespace;

export interface Brand {
  BrandMark: (props: SidebarBrandMarkOwnerProps) => ReactElement;
  BrandName: (props: SidebarBrandNameOwnerProps) => ReactElement;
}

export function createBrand(React: ReactModule): Brand {
  function BrandMark({ size }: SidebarBrandMarkOwnerProps): ReactElement {
    return (
      <svg
        width={size}
        height={size}
        viewBox="415.5 579 500 500"
        fill="none"
        aria-hidden="true"
      >
        <path
          transform="matrix(1,0,0,-1,575.6384,865.52)"
          d="M0 0-81.841 33.4C-94.904 38.731-109.205 29.121-109.205 15.012V-27.962C-109.205-41.696-95.599-51.284-82.665-46.665L-.384-17.277C7.61-14.422 7.86-3.208 0 0"
          fill="#fff148"
        />
        <path
          transform="matrix(1,0,0,-1,567.4265,904.94357)"
          d="M0 0-59.264-24.911C-68.723-28.888-71.136-41.184-63.88-48.44L-41.78-70.539C-34.717-77.602-22.789-75.536-18.513-66.509L8.688-9.082C11.33-3.503 5.691 2.392 0 0"
          fill="#fff148"
        />
        <path
          transform="matrix(1,0,0,-1,695.2335,884.28176)"
          d="M0 0 148.159 62.278C171.808 72.219 177.839 102.96 159.699 121.1L104.451 176.349C86.793 194.006 56.973 188.84 46.284 166.273L-21.719 22.706C-28.326 8.757-14.228-5.981 0 0"
          fill="#fddc0a"
        />
        <path
          transform="matrix(1,0,0,-1,661.3311,848.64736)"
          d="M0 0 51.618 126.481C59.857 146.671 45.006 168.772 23.2 168.772H-43.214C-64.439 168.772-79.258 147.744-72.118 127.755L-26.701 .593C-22.289-11.761-4.957-12.147 0 0"
          fill="#fff148"
        />
        <path
          transform="matrix(1,0,0,-1,613.0776,840.34646)"
          d="M0 0-43.595 103.711C-50.554 120.266-72.072 124.488-84.77 111.79L-123.444 73.115C-135.804 60.755-132.188 39.881-116.391 32.399L-15.894-15.203C-6.13-19.828 4.187-9.96 0 0"
          fill="#fff148"
        />
        <path
          transform="matrix(1,0,0,-1,693.9778,924.0255)"
          d="M0 0 104.161-42.509C120.788-49.294 138.989-37.063 138.989-19.106L138.988 35.588C138.988 53.068 121.671 65.271 105.21 59.392L.489 21.989C-9.686 18.355-10.003 4.082 0 0"
          fill="#98f22f"
        />
        <g opacity="0.8" clipPath="url(#lemoe-hl-clip)">
          <path
            transform="matrix(1,0,0,-1,733.5483,793.91757)"
            d="M0 0C-.463 0-.934 .108-1.374 .336-2.846 1.096-3.423 2.905-2.663 4.378L9.671 28.261C10.432 29.732 12.242 30.311 13.713 29.549 15.186 28.789 15.763 26.979 15.002 25.507L2.668 1.624C2.135 .593 1.086 0 0 0"
            fill="#ffffff"
          />
          <path
            transform="matrix(1,0,0,-1,765.2954,838.1099)"
            d="M0 0C-.958 0-1.899 .457-2.48 1.308-3.415 2.676-3.063 4.542-1.695 5.477L27.259 25.26C28.628 26.198 30.494 25.843 31.429 24.476 32.363 23.107 32.012 21.241 30.644 20.307L1.689 .523C1.172 .169 .583 0 0 0"
            fill="#ffffff"
          />
          <path
            transform="matrix(1,0,0,-1,776.2515,797.22616)"
            d="M0 0C-.768 0-1.536 .293-2.121 .879-3.293 2.05-3.293 3.95-2.121 5.121L28.381 35.623C29.552 36.795 31.453 36.795 32.624 35.623 33.795 34.452 33.795 32.552 32.624 31.381L2.121 .879C1.536 .293 .768 0 0 0"
            fill="#ffffff"
          />
        </g>
        <defs>
          <clipPath id="lemoe-hl-clip">
            <path
              transform="matrix(1,0,0,-1,0,1032.77)"
              d="M730.55 194.66H809.754V272.046H730.55Z"
            />
          </clipPath>
        </defs>
      </svg>
    );
  }

  function BrandName(): ReactElement {
    return <span>Lemoe Harness</span>;
  }

  return { BrandMark, BrandName };
}
