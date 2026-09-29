import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Button, Callout, Card, Flex, Heading, Spinner, Text } from "@radix-ui/themes";
import { ArrowClockwiseIcon, InfoIcon, WarningIcon } from "@phosphor-icons/react";

/**
 * Loading, error and empty, defined once.
 *
 * A moderation panel that shows an empty table when a request failed is worse
 * than one that shows an error: nothing to review and a queue you cannot see
 * look identical, and only one of them is safe to walk away from.
 */

export function useData<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const hasData = useRef(false);

  const run = useCallback(async () => {
    if (!hasData.current) setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      hasData.current = true;
      setData(result);
    } catch (caught) {
      if (!hasData.current) {
        setError(caught instanceof Error ? caught : new Error("Something went wrong"));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    hasData.current = false;
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, reload: run, set: setData };
}

export function PageHeading({
  title,
  caption,
  action,
}: {
  title: string;
  caption?: string;
  action?: React.ReactNode;
}) {
  return (
    <Flex justify="between" align="start" mb="5" gap="4" wrap="wrap">
      <Box>
        <Heading size="6">{title}</Heading>
        {caption ? (
          <Text size="2" color="gray" mt="1" as="p">
            {caption}
          </Text>
        ) : null}
      </Box>
      {action}
    </Flex>
  );
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <Flex align="center" justify="center" gap="2" py="8">
      <Spinner />
      <Text size="2" color="gray">
        {label}
      </Text>
    </Flex>
  );
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <Callout.Root color="red" role="alert">
      <Callout.Icon>
        <WarningIcon size={16} />
      </Callout.Icon>
      <Flex justify="between" align="center" gap="4" width="100%" wrap="wrap">
        <Callout.Text>{error.message}</Callout.Text>
        <Button size="1" variant="soft" color="red" onClick={onRetry}>
          <ArrowClockwiseIcon size={14} />
          Try again
        </Button>
      </Flex>
    </Callout.Root>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <Flex direction="column" align="center" gap="1" py="7" px="4">
        <InfoIcon size={22} color="var(--gray-9)" />
        <Text size="3" weight="medium" mt="2">
          {title}
        </Text>
        <Text size="2" color="gray" align="center" style={{ maxWidth: 380 }}>
          {body}
        </Text>
      </Flex>
    </Card>
  );
}

/** Dates as an operator reads them, in Karachi, where the pilot is. */
export function formatDate(iso: string | null): string {
  if (!iso) return "Unknown";
  return new Date(iso).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Karachi",
  });
}
