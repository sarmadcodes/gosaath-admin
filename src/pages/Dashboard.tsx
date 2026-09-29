import { Badge, Box, Card, Flex, Grid, Separator, Text } from "@radix-ui/themes";
import { Link } from "react-router-dom";
import { api } from "../api";
import { ErrorState, Loading, PageHeading, useData } from "../lib";

/**
 * What is happening at this institution, and what is waiting on somebody.
 *
 * Deliberately not a chart wall. Two of these numbers are a to-do list and
 * the rest are context; making the to-do list look like an analytics tile
 * would bury the only part that needs acting on today.
 */
export function Dashboard() {
  const { data, loading, error, reload } = useData(() => api.overview());

  return (
    <>
      <PageHeading
        title="Overview"
        caption="Your institution, as GoSaath sees it today."
      />

      {loading ? <Loading /> : null}
      {error ? <ErrorState error={error} onRetry={reload} /> : null}

      {data ? (
        <Flex direction="column" gap="5">
          {/* Waiting on somebody. First, because it is the only part that is
              a queue rather than a measurement. */}
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <Waiting
              to="/verifications"
              count={data.pendingVerifications}
              label="Verification requests"
              emptyLabel="No requests waiting"
            />
            <Waiting
              to="/reports"
              count={data.openReports}
              label="Open reports"
              emptyLabel="No open reports"
            />
          </Grid>

          <Card>
            <Grid columns={{ initial: "2", sm: "4" }} gap="5" p="2">
              <Stat value={data.members} label="Members" />
              <Stat value={data.newMembersThisWeek} label="Joined this week" />
              <Stat value={data.activeCommutes} label="Active commutes" />
              <Stat
                value={`${data.seatsTaken} of ${data.seatsOffered}`}
                label="Seats taken"
              />
            </Grid>
          </Card>

          {data.topAreas.length > 0 ? (
            <Card>
              <Box p="2">
                <Text size="2" weight="medium">
                  Where people commute from
                </Text>
                <Text size="1" color="gray" as="p" mb="3">
                  Areas only. GoSaath never records an address.
                </Text>

                <Flex direction="column">
                  {data.topAreas.map((area, index) => (
                    <Box key={area.area}>
                      {index > 0 ? <Separator size="4" my="2" /> : null}
                      <Flex justify="between" align="center">
                        <Text size="2">{area.area}</Text>
                        <Text size="2" color="gray">
                          {area.commuters}
                        </Text>
                      </Flex>
                    </Box>
                  ))}
                </Flex>
              </Box>
            </Card>
          ) : null}
        </Flex>
      ) : null}
    </>
  );
}

function Waiting({
  to,
  count,
  label,
  emptyLabel,
}: {
  to: string;
  count: number;
  label: string;
  emptyLabel: string;
}) {
  const waiting = count > 0;
  return (
    <Card asChild>
      <Link to={to} style={{ textDecoration: "none", color: "inherit" }}>
        <Flex align="center" justify="between" p="2">
          <Box>
            <Text size="2" weight="medium" as="p">
              {waiting ? label : emptyLabel}
            </Text>
            <Text size="1" color="gray">
              {waiting ? "Waiting on you" : "Nothing to do here"}
            </Text>
          </Box>
          {waiting ? (
            <Badge color="amber" size="2" variant="solid">
              {count}
            </Badge>
          ) : (
            <Badge color="gray" size="2" variant="soft">
              0
            </Badge>
          )}
        </Flex>
      </Link>
    </Card>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <Box>
      <Text size="6" weight="medium" as="p">
        {value}
      </Text>
      <Text size="1" color="gray">
        {label}
      </Text>
    </Box>
  );
}
