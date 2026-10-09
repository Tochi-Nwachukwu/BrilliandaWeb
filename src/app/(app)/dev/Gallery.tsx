"use client";

import { Alert } from "@brillianda/ui/Alert";
import { Badge } from "@brillianda/ui/Badge";
import { Button } from "@brillianda/ui/Button";
import { Card, ProgressBar, StatCard } from "@brillianda/ui/Cards";
import { EmptyState, Kbd } from "@brillianda/ui/EmptyState";
import { Hero } from "@brillianda/ui/Hero";
import { Dialog } from "@brillianda/ui/Overlay";
import { PageHeader } from "@brillianda/ui/PageHeader";
import { PasswordField } from "@brillianda/ui/PasswordField";
import { ResponsiveDialog } from "@brillianda/ui/ResponsiveDialog";
import { Ring } from "@brillianda/ui/Ring";
import { FilterTabs } from "@brillianda/ui/Tabs";
import { SelectField, TextAreaField, TextField } from "@brillianda/ui/TextField";
import { toast } from "@brillianda/ui/Toast";
import { useState, type ReactNode } from "react";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3">
      <h2 className="px-1.5 text-[21px] font-medium tracking-[-0.025em]">{title}</h2>
      {children}
    </section>
  );
}

/** Every shared component in one place, in both looks (switch in the account menu). */
export function Gallery() {
  const [sheet, setSheet] = useState<null | "dialog" | "panel" | "old">(null);
  const [tab, setTab] = useState<"all" | "jss" | "ss">("all");

  return (
    <div className="grid gap-8">
      <Hero
        kicker="Good morning, Amaka"
        title="Component gallery"
        actions={
          <Button variant="soft" onClick={() => toast("Saved", { undo: () => toast("Undone") })}>
            Show a toast
          </Button>
        }
      >
        Every shared piece, so changes can be checked against the look book. Press <Kbd>Ctrl</Kbd> <Kbd>K</Kbd> for the command palette.
      </Hero>

      <Section title="Numbers">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard href="/dev/students" icon="students" label="Students" value="482" note="12 added this week" level={0} index={0} />
          <StatCard href="/dev/classes" icon="classes" label="Arms" value="18" level={1} index={1} />
          <StatCard href="/dev/subjects" icon="subjects" label="Subjects" value="14" level={3} index={2} />
          <StatCard href="/dev/more" icon="staff" label="Admins" value="3" note="1 invite waiting" level={4} index={3} />
        </div>
      </Section>

      <Section title="Buttons">
        <Card>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="danger-quiet">Danger, quiet</Button>
            <Button loading>Saving</Button>
            <Button size="sm" variant="secondary">
              Small
            </Button>
            <Button disabled>Disabled</Button>
          </div>
        </Card>
      </Section>

      <Section title="Badges and alerts">
        <Card>
          <div className="grid gap-4">
            <div className="flex flex-wrap gap-2">
              <Badge>Neutral</Badge>
              <Badge tone="success">Active</Badge>
              <Badge tone="warning">Sample data</Badge>
              <Badge tone="danger">Suspended</Badge>
              <Badge tone="info">Invited</Badge>
            </div>
            <Alert>Term 1 starts on 8 September.</Alert>
            <Alert tone="success">All arms have a class teacher.</Alert>
            <Alert tone="warning" action={<Button size="sm" variant="secondary">Fix</Button>}>
              3 students have no parent contact.
            </Alert>
            <Alert tone="danger">That subdomain is taken.</Alert>
          </div>
        </Card>
      </Section>

      <Section title="Fields">
        <Card>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="School name" placeholder="Greenfield College" />
            <TextField label="Email" type="email" error="Enter an email address like name@school.com" />
            <PasswordField label="Password" hint="At least 8 characters" />
            <SelectField label="Class">
              <option>JSS 1</option>
              <option>JSS 2</option>
            </SelectField>
            <TextAreaField label="Note" className="md:col-span-2" />
          </div>
        </Card>
      </Section>

      <Section title="Tabs, progress and rings">
        <Card>
          <div className="grid gap-5">
            <FilterTabs
              label="Level"
              value={tab}
              onChange={setTab}
              items={[
                { value: "all", label: "All", count: 18 },
                { value: "jss", label: "Junior", count: 9 },
                { value: "ss", label: "Senior", count: 9 },
              ]}
            />
            <ProgressBar value={0.62} />
            <div className="flex gap-4">
              <Ring value={0.25} label="25%" />
              <Ring value={0.7} label="70%" color="var(--color-success)" />
            </div>
          </div>
        </Card>
      </Section>

      <Section title="Dialogs">
        <Card description="On a phone both open as a bottom sheet with Save kept in view.">
          <div className="flex flex-wrap gap-2.5">
            <Button variant="secondary" onClick={() => setSheet("dialog")}>
              Responsive dialog
            </Button>
            <Button variant="secondary" onClick={() => setSheet("panel")}>
              Responsive panel
            </Button>
            <Button variant="ghost" onClick={() => setSheet("old")}>
              Old dialog
            </Button>
          </div>
        </Card>
        <ResponsiveDialog
          open={sheet === "dialog" || sheet === "panel"}
          laptop={sheet === "panel" ? "panel" : "dialog"}
          onClose={() => setSheet(null)}
          title="Add an arm"
          description="Arms split a class, like JSS 1A and JSS 1B."
          footer={
            <>
              <Button variant="secondary" onClick={() => setSheet(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setSheet(null);
                  toast("JSS 1C added");
                }}
              >
                Save
              </Button>
            </>
          }
        >
          <div className="grid gap-4">
            <SelectField label="Class">
              <option>JSS 1</option>
            </SelectField>
            <TextField label="Arm name" defaultValue="C" />
            <TextField label="Class teacher (optional)" />
          </div>
        </ResponsiveDialog>
        <Dialog open={sheet === "old"} onClose={() => setSheet(null)} title="Delete this arm?" description="Its 32 students move to Unassigned.">
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSheet(null)}>
              Keep it
            </Button>
            <Button variant="danger" onClick={() => setSheet(null)}>
              Delete
            </Button>
          </div>
        </Dialog>
      </Section>

      <Section title="Empty state">
        <EmptyState title="No subjects yet">Add the subjects your school teaches, then give each arm its list.</EmptyState>
      </Section>

      <PageHeader title="Page header" actions={<Button>Add</Button>}>
        A title, a line under it and actions on the right.
      </PageHeader>
    </div>
  );
}
