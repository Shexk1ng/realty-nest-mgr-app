"use client";

// Galeria zdjęć oferty z podglądem pełnoekranowym i pułapką fokusu w oknie

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, ImageIcon, X } from "lucide-react";
import { isSeedImage } from "@/lib/images";
import { useI18n } from "@/i18n/i18n-context";

const FOCUSABLE = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

function scrollParentOf(el: HTMLElement | null): HTMLElement {
  for (let node = el?.parentElement ?? null; node; node = node.parentElement) {
    const overflowY = getComputedStyle(node).overflowY;
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) {
      return node;
    }
  }
  return document.documentElement;
}

export interface PropertyGalleryProps {
  images: string[];
  alt?: string;
  startIndex?: number;
  overlay?: ReactNode;
  className?: string;
}

export function PropertyGallery({
  images,
  alt,
  startIndex = 0,
  overlay,
  className = "",
}: PropertyGalleryProps) {
  const { t } = useI18n();

  const photos = images.filter((src) => Boolean(src));
  const count = photos.length;

  const [cursor, setCursor] = useState(startIndex);
  const [isOpen, setIsOpen] = useState(false);

  const index = count > 0 ? Math.min(Math.max(cursor, 0), count - 1) : 0;

  const rootRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const tileRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const open = (i: number, trigger: HTMLElement | null) => {
    openerRef.current = trigger;
    setCursor(i);
    setIsOpen(true);
  };

  const close = useCallback(() => setIsOpen(false), []);

  const step = useCallback(
    (delta: number) => {
      if (count < 2) return;
      setCursor((cur) => (Math.min(Math.max(cur, 0), count - 1) + delta + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const opener = openerRef.current ?? tileRef.current;
    const scroller = scrollParentOf(rootRef.current);
    const prevOverflow = scroller.style.overflow;
    const prevPaddingRight = scroller.style.paddingRight;
    const gutter =
      scroller === document.documentElement
        ? window.innerWidth - scroller.clientWidth
        : scroller.offsetWidth - scroller.clientWidth;
    const paddingRight = Number.parseFloat(getComputedStyle(scroller).paddingRight) || 0;

    dialog.showModal();
    closeRef.current?.focus();
    scroller.style.overflow = "hidden";
    if (gutter > 0) scroller.style.paddingRight = `${paddingRight + gutter}px`;

    return () => {
      scroller.style.overflow = prevOverflow;
      scroller.style.paddingRight = prevPaddingRight;
      if (dialog.open) dialog.close();
      opener?.focus();
    };
  }, [isOpen]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      step(event.key === "ArrowLeft" ? -1 : 1);
      return;
    }
    if (event.key !== "Tab") return;

    const nodes = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    if (nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const focused = document.activeElement;
    if (event.shiftKey && (focused === first || focused === dialogRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && focused === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const onScrimClick = (event: React.MouseEvent<HTMLElement>) => {
    if (event.target === event.currentTarget) close();
  };

  const counterOf = (i: number) =>
    t("dashboard.gallery.counter")
      .replace("{current}", String(i + 1))
      .replace("{total}", String(count));

  const altOf = (i: number) =>
    (alt ? t("dashboard.gallery.photoAltTitled").replace("{title}", alt) : t("dashboard.gallery.photoAlt"))
      .replace("{index}", String(i + 1))
      .replace("{total}", String(count));

  return (
    <div ref={rootRef} className={`rn-gallery ${className}`.trimEnd()}>
      <div className="rn-gallery__frame">
        {count > 0 ? (
          <button
            ref={tileRef}
            type="button"
            className="rn-gallery__open"
            aria-label={t("dashboard.gallery.open")}
            onClick={(event) => open(index, event.currentTarget)}
          >
            <Image
              src={photos[index]}
              alt={altOf(index)}
              fill
              sizes="(max-width: 768px) 100vw, 480px"
              unoptimized={isSeedImage(photos[index])}
            />
            <span className="rn-gallery__zoom" aria-hidden>
              <Expand size={15} strokeWidth={1.9} />
            </span>
            {count > 1 && <span className="rn-gallery__count">{counterOf(index)}</span>}
          </button>
        ) : (
          <div className="rn-gallery__empty">
            <ImageIcon size={30} strokeWidth={1.5} aria-hidden />
            <p className="rn-gallery__empty-title">{t("dashboard.gallery.empty")}</p>
            <p className="rn-gallery__empty-hint">{t("dashboard.gallery.emptyHint")}</p>
          </div>
        )}
        {overlay && <div className="rn-gallery__overlay">{overlay}</div>}
      </div>

      {count > 1 && (
        <div className="rn-gallery__thumbs">
          {photos.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              className={`rn-gallery__thumb${i === index ? " is-active" : ""}`}
              aria-label={t("dashboard.gallery.showPhoto").replace("{index}", String(i + 1))}
              aria-current={i === index ? "true" : undefined}
              onClick={(event) => open(i, event.currentTarget)}
            >
              <Image src={src} alt="" width={56} height={42} loading="lazy" unoptimized={isSeedImage(src)} />
            </button>
          ))}
        </div>
      )}

      {isOpen && (
        <dialog
          ref={dialogRef}
          className="rn-lightbox"
          aria-label={t("dashboard.gallery.label")}
          onCancel={(event) => {
            event.preventDefault();
            close();
          }}
          onClose={close}
          onClick={onScrimClick}
          onKeyDown={onKeyDown}
        >
          <div className="rn-lightbox__bar">
            <span className="rn-lightbox__title">{alt ?? ""}</span>
            {count > 1 && <span className="rn-lightbox__counter">{counterOf(index)}</span>}
            <button
              ref={closeRef}
              type="button"
              className="rn-lightbox__btn rn-lightbox__close"
              aria-label={t("dashboard.gallery.close")}
              onClick={close}
            >
              <X size={19} strokeWidth={1.9} />
            </button>
          </div>

          <div className="rn-lightbox__stage" onClick={onScrimClick}>
            {count > 1 && (
              <button
                type="button"
                className="rn-lightbox__btn rn-lightbox__nav rn-lightbox__nav--prev"
                aria-label={t("dashboard.gallery.prev")}
                onClick={() => step(-1)}
              >
                <ChevronLeft size={24} strokeWidth={1.9} />
              </button>
            )}

            <div className="rn-lightbox__canvas" onClick={onScrimClick}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={photos[index]}
                className="rn-lightbox__img"
                src={photos[index]}
                alt={altOf(index)}
                decoding="async"
                draggable={false}
              />
            </div>

            {count > 1 && (
              <button
                type="button"
                className="rn-lightbox__btn rn-lightbox__nav rn-lightbox__nav--next"
                aria-label={t("dashboard.gallery.next")}
                onClick={() => step(1)}
              >
                <ChevronRight size={24} strokeWidth={1.9} />
              </button>
            )}
          </div>
        </dialog>
      )}
    </div>
  );
}
