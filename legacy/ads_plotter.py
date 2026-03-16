# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "plotly",
# ]
# ///
# -*- coding: utf-8 -*-
"""
Created on Wed Mar  9 17:21:37 2022

@author: Alp Tezbasaran
"""
import plotly.graph_objects as go
import collections

def plot_sankey(source_index, target_index, labels, counts, pe_times, colors):
  # Normalize time index
  pe_times = [time/max(pe_times) for time in pe_times]
  fig = go.Figure(data=[go.Sankey(textfont=dict(color="rgba(0,0,0,0)", size=1),
      arrangement='snap',
      node = dict(
        pad = 10,
        thickness = 1,
        # line = dict(color = "black", width = 1),
        # label = labels,
        label = [element.strip("PE_") for element in labels],
        color = colors,
        x = pe_times,
        y = [0.1]*(len(pe_times))
      ),
      link = dict(
        source = source_index,
        target = target_index,
        value = counts,
        color = 'rgba(128, 128, 128, 0.15)'
    ))])

  fig.update_layout(title_text="Basic Sankey Diagram", font_size = 12)
  fig.show()

def tally(source, target):
  pairs = []
  for pair in zip(source,target):
    pairs.append(pair)
  counter = collections.Counter(pairs)
  final_sources = []
  final_targets = []
  final_counts= []
  for pair in counter.keys():
    final_sources.append(pair[0])
    final_targets.append(pair[1])
  for count in counter.values():
    final_counts.append(count)
  return final_sources,final_targets, final_counts

def convert_to_index(sources, targets, read_times):
  labels = sorted(list(set(sources + targets)))
  pe_times = []
  for label in labels:
    pe_times.append(read_times[label])
  source_index = [labels.index(source) for source in sources]
  target_index = [labels.index(target) for target in targets]

  # make terminal nodes red
  color = []
  for _ in labels:
    if _ in sources:
      color.append("blue")
    else:
      color.append("red")

  return source_index, target_index, labels, pe_times, color


def read_file(filename = "Scenario info.txt"):
  event_sequences = {}
  event_times = {}
  try:
    file = open(filename)
    file.close()
    print("Scenario info file is present")
  except:
    raise Exception("Scenario info.txt file is not found!")

  with open(filename, 'r') as file:
    # for i in range(10000):
    #   line = file.readline()
    for line in file:
      if ("Event" in line and "Hightlights" in line.split()):
        event_sequence = line.split()[-2]
        event_sequences[event_sequence] = []
      else:
        for element in line.split():
          added = False
          if ("(PE_" in element):
            pivotal_event = element[1:-1]
            # add the first pivotal event
            if (len(event_sequences[event_sequence]) == 0):
              event_sequences[event_sequence].append(pivotal_event)
              added = True
            # check if the pivotal event is the same, append if not
            if (len(event_sequences[event_sequence]) > 0 and event_sequences[event_sequence][-1] != pivotal_event):
              event_sequences[event_sequence].append(pivotal_event)
              added = True
          if added:
            event_times[pivotal_event] = float(line.split()[0])
  return event_sequences, event_times

def map_to_sankey(event_sequences):
  source = []
  target = []
  for es in event_sequences:
    for pe in range(len(event_sequences[es])-1):
      # print(pe)
      source.append(event_sequences[es][pe])
      target.append(event_sequences[es][pe+1])
  return source,target

if __name__ == '__main__':
  alp, alp_times = read_file()
  # alp.popitem()                   # remove the last element
  source, target = map_to_sankey(alp)
  sources, targets, counts = tally(source, target)
  source_index, target_index, labels, pe_times, color = convert_to_index(sources, targets, alp_times)
  plot_sankey(source_index, target_index, labels, counts, pe_times, color)
