import { useEffect, useState } from "react";
import { Badge, Flex, Table, Text, TextField } from "@radix-ui/themes";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { EmptyState, ErrorState, Loading, PageHeading, formatDate, useData } from "../lib";

/**
 * Everybody at this institution.
 *
 * The phone number is deliberately absent from this list. It exists behind a
 * per-person reveal that asks why and records it, which is worthless if the
 * same numbers can be read a hundred at a time from a table.
 */
export function Members() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");

  // Typing is not a request. Without this the server sees one query per
  // keystroke and the list flickers through partial matches.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, loading, error, reload } = useData(
    () => api.members(search ? { q: search } : {}),
    [search],
  );

  return (
    <>
      <PageHeading
        title="Members"
        caption="Students and staff with a verified institution email."
      />

      <TextField.Root
        placeholder="Search by name or email"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        mb="4"
        style={{ maxWidth: 320 }}
      >
        <TextField.Slot>
          <MagnifyingGlassIcon size={15} />
        </TextField.Slot>
      </TextField.Root>

      {loading ? <Loading /> : null}
      {error ? <ErrorState error={error} onRetry={reload} /> : null}

      {data && data.length === 0 ? (
        <EmptyState
          title={search ? "Nobody matches that" : "No members yet"}
          body={
            search
              ? "Try part of a name, or the start of an email address."
              : "People appear here once they register and confirm their institution email."
          }
        />
      ) : null}

      {data && data.length > 0 ? (
        <Table.Root variant="surface">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Campus</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Badge</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Joined</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>

          <Table.Body>
            {data.map((member) => (
              <Table.Row
                key={member.id}
                className="row-link"
                onClick={() => navigate(`/members/${member.id}`)}
              >
                <Table.Cell>
                  <Flex direction="column">
                    <Flex align="center" gap="2">
                      <Text size="2" weight="medium">
                        {member.name}
                      </Text>
                      {member.suspended ? (
                        <Badge color="red" variant="soft" size="1">
                          Suspended
                        </Badge>
                      ) : null}
                    </Flex>
                    <Text size="1" color="gray">
                      {member.email}
                    </Text>
                  </Flex>
                </Table.Cell>
                <Table.Cell>
                  <Text size="2">{member.campusName}</Text>
                </Table.Cell>
                <Table.Cell>
                  <BadgeStatus status={member.badgeStatus} />
                </Table.Cell>
                <Table.Cell>
                  <Text size="2" color="gray">
                    {formatDate(member.joinedAt)}
                  </Text>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      ) : null}
    </>
  );
}

export function BadgeStatus({ status }: { status: string }) {
  const look =
    status === "approved"
      ? { color: "teal" as const, label: "Verified" }
      : status === "pending"
        ? { color: "amber" as const, label: "Pending" }
        : status === "rejected"
          ? { color: "gray" as const, label: "Rejected" }
          : { color: "gray" as const, label: "None" };

  return (
    <Badge color={look.color} variant="soft" size="1">
      {look.label}
    </Badge>
  );
}
