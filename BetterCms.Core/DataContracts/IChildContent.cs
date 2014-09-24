﻿using System;
using System.Collections.Generic;

namespace BetterCms.Core.DataContracts
{
    public interface IChildContent
    {
        Guid Id { get; }
        
        IContent ChildContent { get; set; }

        Guid AssignmentIdentifier { get; }

        IEnumerable<IOption> Options { get; }
    }
}
